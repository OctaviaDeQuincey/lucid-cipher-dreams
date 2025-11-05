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
};
export default func;
func.id = "deploy_dreamEncryption"; // id required to prevent reexecution
func.tags = ["DreamEncryption"];

