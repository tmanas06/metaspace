// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract AssetRegistry is ERC1155, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(uint256 => string) public tokenUri;
    mapping(uint256 => bool) public tokenExists;

    event TokenMetadataSet(uint256 indexed tokenId, string uri);
    event TokensMinted(address indexed to, uint256[] tokenIds, uint256[] amounts);

    constructor(
        string memory uri_,
        address defaultAdmin,
        address minter,
        address pauser
    ) ERC1155(uri_) {
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
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override(ERC1155) {
        _requireNotPaused();
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
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
        emit TokenMetadataSet(tokenId, uri_);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        if (bytes(tokenUri[tokenId]).length > 0) {
            return tokenUri[tokenId];
        }
        return super.uri(tokenId);
    }

    function mintWithSignature(
        address to,
        uint256 tokenId,
        uint256 amount,
        uint256 deadline,
        bytes memory signature
    ) external onlyRole(MINTER_ROLE) {
        if (block.timestamp > deadline) {
            revert ExpiredSignature();
        }
        if (!tokenExists[tokenId]) {
            revert TokenDoesNotExist();
        }
        _mint(to, tokenId, amount, "");
        emit TokensMinted(to, _asArray(tokenId), _asArray(amount));
    }

    function mintBatchWithSignature(
        address to,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256 deadline,
        bytes memory signature
    ) external onlyRole(MINTER_ROLE) {
        if (block.timestamp > deadline) {
            revert ExpiredSignature();
        }
        if (tokenIds.length != amounts.length) {
            revert LengthMismatch();
        }
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (!tokenExists[tokenIds[i]]) {
                revert TokenDoesNotExist();
            }
        }
        _mintBatch(to, tokenIds, amounts, "");
        emit TokensMinted(to, tokenIds, amounts);
    }

    function _asArray(uint256 value) internal pure returns (uint256[] memory) {
        uint256[] memory arr = new uint256[](1);
        arr[0] = value;
        return arr;
    }

    error ExpiredSignature();
    error TokenDoesNotExist();
    error LengthMismatch();
}