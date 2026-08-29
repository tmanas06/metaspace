// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AttendanceRegistry
 * @dev Records onchain check-ins for virtual space attendance.
 * Backend (holding MINTER_ROLE) calls checkIn when a user joins a room.
 * Emits CheckIn event for indexing. Optionally mints ProofOfAttendance SBT after threshold.
 */
contract AttendanceRegistry is AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Attendance threshold for auto-minting Proof of Attendance SBT
    uint256 public attendanceThreshold;

    // Optional SBT contract for Proof of Attendance (set after deployment)
    address public proofOfAttendanceSBT;

    // Check-in record
    struct CheckIn {
        uint256 timestamp;
        string roomId;
        uint256 sessionId;
    }

    // User -> list of check-ins
    mapping(address => CheckIn[]) public userCheckIns;

    // Room -> user -> count (for quick stats)
    mapping(string => mapping(address => uint256)) public roomUserCount;

    // Total check-ins per room
    mapping(string => uint256) public roomTotalCheckIns;

    event CheckInRecorded(
        address indexed user,
        string roomId,
        uint256 timestamp,
        uint256 sessionId,
        uint256 totalUserCheckIns
    );

    event ThresholdReached(address indexed user, uint256 count);
    event ProofOfAttendanceMinted(address indexed user, uint256 tokenId);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event ProofOfAttendanceSBTSet(address indexed sbtAddress);

    constructor(
        address defaultAdmin,
        address minter,
        address pauser,
        uint256 _attendanceThreshold
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(PAUSER_ROLE, pauser);
        attendanceThreshold = _attendanceThreshold;
    }

    // ─── Admin Functions ───

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setAttendanceThreshold(uint256 newThreshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldThreshold = attendanceThreshold;
        attendanceThreshold = newThreshold;
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    function setProofOfAttendanceSBT(address sbtAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        proofOfAttendanceSBT = sbtAddress;
        emit ProofOfAttendanceSBTSet(sbtAddress);
    }

    // ─── Core Function: Check-In ───

    /**
     * @dev Called by backend when user joins a room.
     * Records timestamp, roomId, sessionId onchain.
     * Emits CheckInRecorded event for indexing.
     * If user reaches attendanceThreshold and SBT is set, emits ThresholdReached.
     */
    function checkIn(
        address user,
        string calldata roomId,
        uint256 sessionId
    ) external onlyRole(MINTER_ROLE) {
        _requireNotPaused();

        uint256 timestamp = block.timestamp;

        // Record check-in
        userCheckIns[user].push(CheckIn({
            timestamp: timestamp,
            roomId: roomId,
            sessionId: sessionId
        }));

        // Update counters
        uint256 newUserCount = ++roomUserCount[roomId][user];
        roomTotalCheckIns[roomId]++;

        // Get total check-ins for this user across all rooms
        uint256 totalUserCheckIns = userCheckIns[user].length;

        emit CheckInRecorded(user, roomId, timestamp, sessionId, totalUserCheckIns);

        // Check if threshold reached for Proof of Attendance
        if (totalUserCheckIns == attendanceThreshold && proofOfAttendanceSBT != address(0)) {
            emit ThresholdReached(user, totalUserCheckIns);
        }
    }

    function checkInBatch(
        address[] calldata users,
        string calldata roomId,
        uint256 sessionId
    ) external onlyRole(MINTER_ROLE) {
        _requireNotPaused();

        uint256 timestamp = block.timestamp;

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];

            userCheckIns[user].push(CheckIn({
                timestamp: timestamp,
                roomId: roomId,
                sessionId: sessionId
            }));

            uint256 newUserCount = ++roomUserCount[roomId][user];
            roomTotalCheckIns[roomId]++;

            uint256 totalUserCheckIns = userCheckIns[user].length;

            emit CheckInRecorded(user, roomId, timestamp, sessionId, totalUserCheckIns);

            if (totalUserCheckIns == attendanceThreshold && proofOfAttendanceSBT != address(0)) {
                emit ThresholdReached(user, totalUserCheckIns);
            }
        }
    }

    // ─── View Functions ───

    function getUserCheckIns(address user) external view returns (CheckIn[] memory) {
        return userCheckIns[user];
    }

    function getUserCheckInCount(address user) external view returns (uint256) {
        return userCheckIns[user].length;
    }

    function getUserRoomCheckIns(address user, string calldata roomId) external view returns (uint256) {
        return roomUserCount[roomId][user];
    }

    function getRoomTotalCheckIns(string calldata roomId) external view returns (uint256) {
        return roomTotalCheckIns[roomId];
    }

    function getLatestCheckIn(address user) external view returns (CheckIn memory) {
        CheckIn[] storage checkIns = userCheckIns[user];
        if (checkIns.length == 0) {
            return CheckIn(0, "", 0);
        }
        return checkIns[checkIns.length - 1];
    }

    function hasReachedThreshold(address user) external view returns (bool) {
        return userCheckIns[user].length >= attendanceThreshold;
    }

    // ─── Overrides ───

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}