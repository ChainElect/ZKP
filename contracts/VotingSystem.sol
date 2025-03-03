/// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Structs/ElectionStructs.sol";
import "../circuits/contracts/ZKTree.sol";
import "./Events/ElectionEvents.sol";

/// @title Voting System with zk-SNARK Verification
/// @notice This contract manages elections and verifies votes using zk-SNARK proofs.
contract VotingSystem is Ownable, ZKTree {
    mapping(uint256 => ElectionDetails) private elections; // Store elections by ID
    uint256 public electionCount; // Total number of elections created

    /// @notice Constructor to initialize the contract with the deployer as the owner and verifier address
    constructor(
        IVerifier _verifier,
        uint32 _levels,
        IHasher _hasher
    ) Ownable(msg.sender) ZKTree(_levels, _hasher, _verifier) {}

    /// @notice Modifier to ensure the election is ongoing
    modifier electionOngoing(uint256 electionId) {
        require(
            block.timestamp >= elections[electionId].startTime &&
                block.timestamp <= elections[electionId].endTime,
            "Election is closed"
        );
        _;
    }

    /// @notice Create a new election
    function createElection(
        string memory _name,
        uint256 _startTime,
        uint256 _endTime
    ) public onlyOwner {
        require(_endTime > _startTime, "End time must be after start time");

        electionCount++;
        ElectionDetails storage newElection = elections[electionCount];
        newElection.id = electionCount;
        newElection.name = _name;
        newElection.startTime = _startTime;
        newElection.endTime = _endTime;

        //emit ElectionCreated(electionCount, _name, _startTime, _endTime);
    }

    /// @notice Add a party to an election
    function addParty(
        uint256 electionId,
        string memory _partyName,
        string memory _description
    ) public onlyOwner {
        ElectionDetails storage election = elections[electionId];
        require(
            block.timestamp < election.startTime,
            "Cannot add parties to a started election"
        );

        election.parties.push(
            Party({
                id: election.parties.length + 1,
                name: _partyName,
                voteCount: 0, // Still tracked for result aggregation, but not directly incremented
                description: _description
            })
        );

        // emit PartyAdded(
        //     electionId,
        //     election.parties.length,
        //     _partyName,
        //     _description
        // );
    }

    function vote(
        uint256 electionId,
        uint256 partyId,
        uint256 _nullifier,
        uint256 _root,
        uint[2] calldata proofA,
        uint[2][2] calldata proofB,
        uint[2] calldata proofC
    ) public electionOngoing(electionId) {
        ElectionDetails storage election = elections[electionId];

        require(!election.hasVoted[msg.sender], "You have already voted");
        require(
            partyId > 0 && partyId <= election.parties.length,
            "Invalid party ID"
        );

        // Verify the proof
        _nullify(bytes32(_nullifier), bytes32(_root), proofA, proofB, proofC);

        // Increment vote count
        election.parties[partyId - 1].voteCount++;

        //emit Voted(electionId, partyId, msg.sender);
    }

    /// @notice Returns all parties in an election
    function getElectionParties(
        uint256 electionId
    ) external view returns (Party[] memory) {
        return elections[electionId].parties;
    }

    /// @notice Get results of a closed election
    /// @dev In a real zk system, results would be computed off-chain and verified
    function getResults(
        uint256 electionId
    ) public view returns (Party[] memory) {
        ElectionDetails storage election = elections[electionId];
        require(
            block.timestamp > election.endTime,
            "Election is still ongoing"
        );

        return election.parties;
    }

    /// @notice Get details of an election by ID
    function getElectionDetails(
        uint256 electionId
    )
        public
        view
        returns (
            uint256 id,
            string memory name,
            uint256 startTime,
            uint256 endTime,
            Party[] memory parties
        )
    {
        ElectionDetails storage election = elections[electionId];
        return (
            election.id,
            election.name,
            election.startTime,
            election.endTime,
            election.parties
        );
    }

    /// @notice Get all ongoing elections
    function getAllOngoingElections()
        public
        view
        returns (SimpleElectionDetails[] memory)
    {
        uint256 ongoingCount = 0;

        for (uint256 i = 1; i <= electionCount; i++) {
            if (
                block.timestamp >= elections[i].startTime &&
                block.timestamp <= elections[i].endTime
            ) {
                ongoingCount++;
            }
        }

        SimpleElectionDetails[]
            memory ongoingElections = new SimpleElectionDetails[](ongoingCount);
        uint256 index = 0;

        for (uint256 i = 1; i <= electionCount; i++) {
            if (
                block.timestamp >= elections[i].startTime &&
                block.timestamp <= elections[i].endTime
            ) {
                ElectionDetails storage election = elections[i];
                ongoingElections[index] = SimpleElectionDetails(
                    election.id,
                    election.name,
                    election.startTime,
                    election.endTime,
                    election.parties.length
                );
                index++;
            }
        }

        return ongoingElections;
    }

    /// @notice Get all closed elections
    function getClosedElection()
        public
        view
        returns (SimpleElectionDetails[] memory)
    {
        uint256 closedCount = 0;

        for (uint256 i = 1; i <= electionCount; i++) {
            if (block.timestamp > elections[i].endTime) {
                closedCount++;
            }
        }

        SimpleElectionDetails[]
            memory closedElections = new SimpleElectionDetails[](closedCount);
        uint256 index = 0;

        for (uint256 i = 1; i <= electionCount; i++) {
            if (block.timestamp > elections[i].endTime) {
                ElectionDetails storage election = elections[i];
                closedElections[index] = SimpleElectionDetails(
                    election.id,
                    election.name,
                    election.startTime,
                    election.endTime,
                    election.parties.length
                );
                index++;
            }
        }

        return closedElections;
    }
}
