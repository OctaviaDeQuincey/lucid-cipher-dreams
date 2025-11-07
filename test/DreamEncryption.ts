import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { DreamEncryption, DreamEncryption__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("DreamEncryption")) as DreamEncryption__factory;
  const contract = (await factory.deploy()) as DreamEncryption;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("DreamEncryption", function () {
  let signers: Signers;
  let contract: DreamEncryption;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("should have zero dreams after deployment", async function () {
    const count = await contract.getDreamCount();
    expect(count).to.eq(0);
  });

  it("should reject empty dream data", async function () {
    const encryptedData = ethers.toUtf8Bytes(""); // Empty data

    // Encrypt initial interpretation count (0)
    const encryptedCount = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(0)
      .encrypt();

    await expect(
      contract
        .connect(signers.alice)
        .submitDream(encryptedData, encryptedCount.handles[0], encryptedCount.inputProof)
    ).to.be.revertedWith("Empty dream data");
  });

  it("should emit InterpretationCountIncremented event", async function () {
    const dreamText = "I dreamed of flying through the clouds";
    const encryptedData = ethers.toUtf8Bytes(dreamText);

    // Submit dream
    const encryptedCount = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(0)
      .encrypt();

    await contract
      .connect(signers.alice)
      .submitDream(encryptedData, encryptedCount.handles[0], encryptedCount.inputProof);

    // Increment interpretation count
    const incrementInput = await fhevm
      .createEncryptedInput(contractAddress, signers.bob.address)
      .add32(1)
      .encrypt();

    const tx = await contract
      .connect(signers.bob)
      .incrementInterpretationCount(0, incrementInput.handles[0], incrementInput.inputProof);

    // Check event emission
    await expect(tx).to.emit(contract, "InterpretationCountIncremented").withArgs(0, signers.bob.address);
  });

  it("should handle multiple dreams efficiently", async function () {
    const dreamTexts = [
      "Dream of flying whales",
      "Underwater city vision",
      "Time-traveling through memories",
      "Dancing with shadow creatures"
    ];

    // Submit multiple dreams
    for (let i = 0; i < dreamTexts.length; i++) {
      const encryptedData = ethers.toUtf8Bytes(dreamTexts[i]);
      const encryptedCount = await fhevm
        .createEncryptedInput(contractAddress, signers.alice.address)
        .add32(0)
        .encrypt();

      await contract
        .connect(signers.alice)
        .submitDream(encryptedData, encryptedCount.handles[0], encryptedCount.inputProof);
    }

    // Verify all dreams were stored
    const totalCount = await contract.getDreamCount();
    expect(totalCount).to.eq(dreamTexts.length);

    // Verify owner's dream count
    const ownerCount = await contract.getDreamCountByOwner(signers.alice.address);
    expect(ownerCount).to.eq(dreamTexts.length);

    // Verify dream IDs
    const dreamIds = await contract.getDreamIdsByOwner(signers.alice.address);
    expect(dreamIds.length).to.eq(dreamTexts.length);
    for (let i = 0; i < dreamIds.length; i++) {
      expect(dreamIds[i]).to.eq(i);
    }
  });

  it("should submit a dream successfully", async function () {
    const dreamText = "I dreamed of flying through the clouds";
    const encryptedData = ethers.toUtf8Bytes(dreamText); // In real use, this would be AES-GCM encrypted

    // Encrypt initial interpretation count (0)
    const encryptedCount = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(0)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .submitDream(encryptedData, encryptedCount.handles[0], encryptedCount.inputProof);
    await tx.wait();

    const count = await contract.getDreamCount();
    expect(count).to.eq(1);

    const [owner, createdAt] = await contract.getDreamMeta(0);
    expect(owner).to.eq(signers.alice.address);
    expect(createdAt).to.be.gt(0);
  });

  it("should retrieve dream data", async function () {
    const dreamText = "A mysterious dream";
    const encryptedData = ethers.toUtf8Bytes(dreamText);

    const encryptedCount = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(0)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .submitDream(encryptedData, encryptedCount.handles[0], encryptedCount.inputProof);
    await tx.wait();

    const retrievedData = await contract.getDreamData(0);
    expect(ethers.toUtf8String(retrievedData)).to.eq(dreamText);
  });

  it("should increment interpretation count", async function () {
    const encryptedData = ethers.toUtf8Bytes("Test dream");

    // Submit dream with count 0
    const encryptedCountZero = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(0)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .submitDream(encryptedData, encryptedCountZero.handles[0], encryptedCountZero.inputProof);
    await tx.wait();

    // Increment count by 1
    const encryptedOne = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(1)
      .encrypt();

    tx = await contract
      .connect(signers.alice)
      .incrementInterpretationCount(0, encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    // Decrypt and verify
    const encryptedCount = await contract.getInterpretationCount(0);
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCount,
      contractAddress,
      signers.alice,
    );

    expect(clearCount).to.eq(1);
  });

  it("should track dreams by owner", async function () {
    const encryptedData1 = ethers.toUtf8Bytes("Dream 1");
    const encryptedData2 = ethers.toUtf8Bytes("Dream 2");

    const encryptedCount1 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(0)
      .encrypt();

    const encryptedCount2 = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(0)
      .encrypt();

    let tx = await contract
      .connect(signers.alice)
      .submitDream(encryptedData1, encryptedCount1.handles[0], encryptedCount1.inputProof);
    await tx.wait();

    tx = await contract
      .connect(signers.alice)
      .submitDream(encryptedData2, encryptedCount2.handles[0], encryptedCount2.inputProof);
    await tx.wait();

    const count = await contract.getDreamCountByOwner(signers.alice.address);
    expect(count).to.eq(2);

    const ids = await contract.getDreamIdsByOwner(signers.alice.address);
    expect(ids.length).to.eq(2);
    expect(ids[0]).to.eq(0);
    expect(ids[1]).to.eq(1);
  });

  it("should reject empty dream data", async function () {
    const encryptedCount = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(0)
      .encrypt();

    await expect(
      contract
        .connect(signers.alice)
        .submitDream("0x", encryptedCount.handles[0], encryptedCount.inputProof)
    ).to.be.revertedWith("Empty dream data");
  });
});



