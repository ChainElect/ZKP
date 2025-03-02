// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract ElectionEvents {
    /// @notice Event emitted when a new election is created
    event ElectionCreated(
        uint256 indexed electionId,
        string name,
        uint256 startTime,
        uint256 endTime,
        bytes32 merkleRoot // Added for ZKP
    );

    /// @notice Event emitted when a new party is added to an election
    event PartyAdded(
        uint256 indexed electionId,
        uint256 indexed partyId,
        string name,
        string description
    );

    /// @notice Event emitted when a vote is cast
    event Voted(
        uint256 indexed electionId,
        uint256 indexed partyId,
        address indexed voter
    );
}
