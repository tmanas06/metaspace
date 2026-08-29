// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CredentialSBT is ERC721, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(uint256 => string) public tokenUri;
    mapping(uint256 => bool) public tokenExists;
    mapping(address => mapping(uint256 => bool)) public hasCredential;

    event CredentialMinted(address indexed to, uint256 indexed tokenId, string uri);

    constructor(
        string memory name_,
        string memory symbol_,
        address defaultAdmin,
        address minter,
        address pauser
    ) ERC721(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(PAUSER_ROLE, pauser);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721) returns (address) {
        _requireNotPaused();
        
        // Prevent transfers between non-zero addresses (soulbound)
        if (to != address(0) && _ownerOf(tokenId) != address(0)) {
            revert SoulboundTransfer();
        }
        
        // Prevent burning
        if (to == address(0)) {
            revert SoulboundBurn();
        }
        
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function setTokenURI(uint256 tokenId, string memory uri_)
        external
        onlyRole(MINTER_ROLE)
    {
        tokenUri[tokenId] = uri_;
        tokenExists[tokenId] = true;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (bytes(tokenUri[tokenId]).length > 0) {
            return tokenUri[tokenId];
        }
        return super.tokenURI(tokenId);
    }

    function mintWithSignature(
        address to,
        uint256 tokenId,
        uint256 deadline,
        bytes memory signature
    ) external onlyRole(MINTER_ROLE) {
        if (block.timestamp > deadline) {
            revert ExpiredSignature();
        }
        if (!tokenExists[tokenId]) {
            revert TokenDoesNotExist();
        }
        if (hasCredential[to][tokenId]) {
            revert AlreadyOwned();
        }
        _safeMint(to, tokenId);
        hasCredential[to][tokenId] = true;
        emit CredentialMinted(to, tokenId, tokenUri[tokenId]);
    }

    error SoulboundTransfer();
    error SoulboundBurn();
    error ExpiredSignature();
    error TokenDoesNotExist();
    error AlreadyOwned();
}