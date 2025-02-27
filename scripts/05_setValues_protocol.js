// $ npx hardhat run scripts/05_setValues_protocol.js --network rinkeby
const hre = require("hardhat");
const dotenv = require('dotenv');
const network = hre.network.name;
const fs = require('fs');
const envConfig = dotenv.parse(fs.readFileSync(`.env`));
for (const k in envConfig) {
    process.env[k] = envConfig[k]
}

async function main() {
    let dir = './networks/';
    const fileName = network + '.json';
    let data = JSON.parse(await fs.readFileSync(dir + fileName, { encoding: 'utf8' }));

    const [deployer] = await hre.ethers.getSigners();

    console.log('Network: ', network);
    console.log('Set values for contracts with the account:', deployer.address);
    console.log('Account balance:', (await deployer.getBalance()).toString());

    let prefix = network.toUpperCase();
    let PIE_ADDRESS = process.env[prefix + '_PIE_ADDRESS'];

    // 1. Controller transactions
    // Set implementation for unitroller
    const UnitrollerInterface = await hre.ethers.getContractFactory("Unitroller");
    const unitrollerInterface = await UnitrollerInterface.attach(data.unitroller);

    let tx = await unitrollerInterface._setPendingImplementation(data.controller);
    console.log("Tx1 hash: ", tx.hash);
    await tx.wait();

    const ControllerInterface = await hre.ethers.getContractFactory("Controller");
    const controllerInterface = await ControllerInterface.attach(data.controller);

    tx = await controllerInterface._become(data.unitroller);
    console.log("Tx2 hash: ", tx.hash);
    await tx.wait();

    // Settings transactions
    const unitrollerWithControllerInterface = await ControllerInterface.attach(data.unitroller);
    tx = await unitrollerWithControllerInterface._setLiquidationIncentive(process.env.CONTROLLER_LIQUIDATION_INCENTIVE);
    console.log("Tx3 hash: ", tx.hash);
    tx = await unitrollerWithControllerInterface._setMaxAssets(process.env.CONTROLLER_MAX_ASSETS);
    console.log("Tx4 hash: ", tx.hash);
    tx = await unitrollerWithControllerInterface._setCloseFactor(process.env.CONTROLLER_CLOSE_FACTOR);
    console.log("Tx5 hash: ", tx.hash);
    tx = await unitrollerWithControllerInterface._setFeeFactorMaxMantissa(process.env.CONTROLLER_FEE_FACTOR_MAX_MANTISSA);
    console.log("Tx6 hash: ", tx.hash);
    tx = await unitrollerWithControllerInterface._setLiquidateGuardian(process.env.CONTROLLER_LIQUIDATE_GUARDIAN);
    console.log("Tx7 hash: ", tx.hash);
    tx = await unitrollerWithControllerInterface._setPauseGuardian(process.env.CONTROLLER_PAUSE_GUARDIAN);
    console.log("Tx8 hash: ", tx.hash);
    tx = await unitrollerWithControllerInterface._setUserModeratePoolData(
        process.env.CONTROLLER_USER_PAUSE_DEPOSIT_AMOUNT,
        process.env.CONTROLLER_GUARDIAN_MODERATE_TIME
    );
    console.log("Tx8_ hash: ", tx.hash);
    tx = await unitrollerWithControllerInterface._setBorrowDelay(process.env.CONTROLLER_BORROW_DELAY);
    console.log("Tx9 hash: ", tx.hash);
    tx = await unitrollerWithControllerInterface._setDistributor(data.distributorProxy);
    console.log("Tx9_ hash: ", tx.hash);

    // 2. Registry transactions
    const RegistryInterface = await hre.ethers.getContractFactory("Registry");
    const registryInterface = await RegistryInterface.attach(data.registryProxy);

    tx = await registryInterface._setFactoryContract(data.pTokenFactory);
    console.log("Tx10 hash", tx.hash);
    await tx.wait();

    tx = await registryInterface._setOracle(data.priceOracleProxy);
    console.log("Tx11 hash", tx.hash);
    await tx.wait();

    // 3. PriceOracle transactions
    const PriceOracleInterface = await hre.ethers.getContractFactory("PriceOracle");
    const priceOracleInterface = await PriceOracleInterface.attach(data.priceOracleProxy);

    tx = await priceOracleInterface._addOracle(data.uniswapV2PriceOracleProxy);
    console.log("Tx11_ hash", tx.hash);
    await tx.wait();

    if (network !== 'bsc' && network !== 'bscTestnet') {
        // 3a. Add uniswap v3
        tx = await priceOracleInterface._addOracle(data.uniswapV3PriceOracleProxy);
        console.log("Tx11_2 hash", tx.hash);
        await tx.wait();
    }

    // 4. Factory transactions
    const PTokenFactoryInterface = await hre.ethers.getContractFactory("PTokenFactory");
    const pTokenFactoryInterface = await PTokenFactoryInterface.attach(data.pTokenFactory);

    tx = await pTokenFactoryInterface._createPETH(data.pEtherDelegate, "ETH");
    console.log("Tx12 hash", tx.hash);
    await tx.wait();

    tx = await pTokenFactoryInterface._createPPIE(PIE_ADDRESS, data.ppieDelegate);
    console.log("Tx13 hash", tx.hash);
    await tx.wait();

    tx = await pTokenFactoryInterface._setCreatePoolFeeAmount(process.env.FACTORY_POOL_FEE_AMOUNT);
    console.log("Tx14 hash: ", tx.hash);

    console.log('Finish!');
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });