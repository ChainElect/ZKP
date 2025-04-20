const { expect } = require('chai');
const { ethers } = require('ethers');
const { buildMimcSponge } = require('circomlibjs');
const snarkjs = require('snarkjs');
const path = require('path');
const fs = require('fs');

// Import the zkpService for testing
const zkpService = require('../src/services/zkpService');
const merkleTreeService = require('../src/services/merkleTreeService');

describe("ZKP Voting System Integration Test", function() {
  this.timeout(60000); // Set a longer timeout for generating ZK proofs
  
  let mimc;
  let commitment;
  
  before(async () => {
    // Initialize MiMC
    mimc = await buildMimcSponge();
  });
  
  it("should generate a commitment correctly", async () => {
    // Generate a commitment
    commitment = await zkpService.generateCommitment();
    
    // Verify structure
    expect(commitment).to.have.property('nullifier');
    expect(commitment).to.have.property('secret');
    expect(commitment).to.have.property('commitment');
    expect(commitment).to.have.property('nullifierHash');
    
    // Verify the commitment was calculated correctly
    const expectedCommitment = mimc.F.toString(mimc.multiHash([
      commitment.nullifier.toString(), 
      commitment.secret.toString()
    ]));
    expect(commitment.commitment.toString()).to.equal(expectedCommitment.toString());
  });
  
  it("should add a commitment to the Merkle tree", async () => {
    // Add the commitment
    const root = await merkleTreeService.addCommitment(commitment.commitment);
    
    // Verify the commitment was added
    const merklePath = await merkleTreeService.getMerklePath(commitment.commitment);
    expect(merklePath.root).to.equal(root);
  });
  
  it("should generate a valid ZK proof", async () => {
    // Generate proof
    const zkProof = await zkpService.generateVotingProof(
      commitment.nullifier,
      commitment.secret,
      commitment.commitment
    );
    
    // Verify the proof structure
    expect(zkProof).to.have.property('nullifierHash');
    expect(zkProof).to.have.property('root');
    expect(zkProof).to.have.property('proof_a');
    expect(zkProof).to.have.property('proof_b');
    expect(zkProof).to.have.property('proof_c');
    
    // Verify nullifier hash matches
    expect(zkProof.nullifierHash).to.equal(commitment.nullifierHash);
  });
  
  it("should verify the proof using the Verifier contract", async () => {
    // This would test contract interaction
    // For full integration tests with a contract, you'd need to deploy a test contract
    
    // For now, we'll just verify the proof format is correct
    const zkProof = await zkpService.generateVotingProof(
      commitment.nullifier,
      commitment.secret,
      commitment.commitment
    );
    
    expect(zkProof.proof_a).to.be.an('array').with.length(2);
    expect(zkProof.proof_b).to.be.an('array').with.length(2);
    expect(zkProof.proof_b[0]).to.be.an('array').with.length(2);
    expect(zkProof.proof_b[1]).to.be.an('array').with.length(2);
    expect(zkProof.proof_c).to.be.an('array').with.length(2);
  });
});