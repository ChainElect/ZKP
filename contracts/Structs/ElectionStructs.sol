// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

struct Party {
    uint256 id;
    string name;
    uint256 voteCount;
    string description;
}

struct ElectionDetails {
    uint256 id;
    string name;
    uint256 startTime;
    uint256 endTime;
    Party[] parties;
    mapping(address => bool) hasVoted;
    mapping(uint256 => bool) nullifiers; // Added to prevent double voting
}

struct SimpleElectionDetails {
    uint256 id;
    string name;
    uint256 startTime;
    uint256 endTime;
    uint256 partyCount;
}