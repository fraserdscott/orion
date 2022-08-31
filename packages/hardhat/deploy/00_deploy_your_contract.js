module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("YourContract", {
    from: deployer,
    log: true,
    waitConfirmations: 5,
  });

  await execute("YourContract", { from: deployer, log: true }, "addColliders", [
    ["500000000000000000", ["1000000000000000000", "2000000000000000000"]],
    ["500000000000000000", ["2000000000000000000", "2000000000000000000"]],
    ["1000000000000000000", ["5000000000000000000", "4000000000000000000"]],
  ]);
};
module.exports.tags = ["YourContract"];
