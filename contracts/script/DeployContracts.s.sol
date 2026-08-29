// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AssetRegistry.sol";
import "../src/CredentialSBT.sol";

contract DeployContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy AssetRegistry (ERC1155)
        // uri: base URI for tokens (e.g., "https://api.example.com/token/{id}.json")
        // defaultAdmin: deployer
        // minter: deployer (backend will be granted later)
        // pauser: deployer
        AssetRegistry assetRegistry = new AssetRegistry(
            "https://api.virtualverse.example.com/asset/{id}.json",
            deployer,
            deployer,
            deployer
        );
        
        // Deploy CredentialSBT (ERC721 Soulbound)
        CredentialSBT credentialSBT = new CredentialSBT(
            "VirtualVerse Credentials",
            "VVCRED",
            deployer,
            deployer,
            deployer
        );

        console.log("AssetRegistry deployed to:", address(assetRegistry));
        console.log("CredentialSBT deployed to:", address(credentialSBT));

        vm.stopBroadcast();
    }
}