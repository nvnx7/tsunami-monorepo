import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  await deploy('revokeVerifier', {
    contract: 'contracts/verifiers/RevokeVerifier.sol:Verifier',
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });
};

deploy.tags = ['verifier', 'revokeVerifier'];
export default deploy;
