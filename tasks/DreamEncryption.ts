import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("dream-encryption:deploy", "Deploy DreamEncryption contract")
  .setAction(async function (taskArguments: TaskArguments, { ethers, deployments }) {
    const { deployer } = await ethers.getNamedSigners();

    console.log("Deploying DreamEncryption contract...");

    const deployment = await deployments.deploy("DreamEncryption", {
      from: await deployer.getAddress(),
      log: true,
    });

    console.log(`DreamEncryption deployed to: ${deployment.address}`);
  });

task("dream-encryption:get-count", "Get total dream count")
  .addParam("address", "Contract address")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const contract = await ethers.getContractAt("DreamEncryption", taskArguments.address);

    const count = await contract.getDreamCount();
    console.log(`Total dreams: ${count}`);
  });

task("dream-encryption:get-dream-meta", "Get dream metadata")
  .addParam("address", "Contract address")
  .addParam("id", "Dream ID")
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const contract = await ethers.getContractAt("DreamEncryption", taskArguments.address);
    const id = parseInt(taskArguments.id);

    const [owner, createdAt] = await contract.getDreamMeta(id);
    console.log(`Dream ${id}:`);
    console.log(`  Owner: ${owner}`);
    console.log(`  Created at: ${new Date(Number(createdAt) * 1000).toISOString()}`);
  });



