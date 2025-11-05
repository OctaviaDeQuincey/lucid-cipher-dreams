import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedDreamEncryption = await deploy("DreamEncryption", {
    from: deployer,
    log: true,
  });

  console.log(`DreamEncryption contract: `, deployedDreamEncryption.address);

  // Verify contract on Etherscan if not on localhost/hardhat
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: deployedDreamEncryption.address,
        constructorArguments: [],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }
};
export default func;
func.id = "deploy_dreamEncryption"; // id required to prevent reexecution
func.tags = ["DreamEncryption"];

