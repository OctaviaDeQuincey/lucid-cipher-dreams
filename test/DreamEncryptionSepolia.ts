import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { DreamEncryption } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("DreamEncryptionSepolia", function () {
  let signers: Signers;
  let contract: DreamEncryption;
  let contractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const DreamEncryptionDeployment = await deployments.get("DreamEncryption");
      contractAddress = DreamEncryptionDeployment.address;
      contract = await ethers.getContractAt("DreamEncryption", DreamEncryptionDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("submit a dream on Sepolia", async function () {
    steps = 8;

    this.timeout(4 * 40000);

    const dreamText = "I dreamed of a magical world";
    const encryptedData = ethers.toUtf8Bytes(dreamText);

    progress("Encrypting interpretation count '0'...");
    const encryptedCount = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(0)
      .encrypt();

    progress(
      `Call submitDream() DreamEncryption=${contractAddress} signer=${signers.alice.address}...`,
    );
    let tx = await contract
      .connect(signers.alice)
      .submitDream(encryptedData, encryptedCount.handles[0], encryptedCount.inputProof);
    await tx.wait();

    progress(`Call getDreamCount()...`);
    const count = await contract.getDreamCount();
    expect(count).to.be.gt(0);

    progress(`Call getDreamMeta(0)...`);
    const [owner, createdAt] = await contract.getDreamMeta(0);
    expect(owner).to.eq(signers.alice.address);

    progress(`Call getDreamData(0)...`);
    const retrievedData = await contract.getDreamData(0);
    expect(ethers.toUtf8String(retrievedData)).to.eq(dreamText);

    progress("Encrypting increment '1'...");
    const encryptedOne = await fhevm
      .createEncryptedInput(contractAddress, signers.alice.address)
      .add32(1)
      .encrypt();

    progress(`Call incrementInterpretationCount(0, 1)...`);
    tx = await contract
      .connect(signers.alice)
      .incrementInterpretationCount(0, encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    progress(`Decrypting interpretation count...`);
    const encryptedInterpretationCount = await contract.getInterpretationCount(0);
    const clearCount = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedInterpretationCount,
      contractAddress,
      signers.alice,
    );
    progress(`Clear interpretation count=${clearCount}`);

    expect(clearCount).to.eq(1);
  });
});



