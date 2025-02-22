const { assert } = require("chai");
const { wasm: wasmTester } = require("circom_tester");
const { buildPoseidon } = require("circomlibjs");

describe("Voting Circuit", function () {
  let votingCircuit;
  let poseidon;
  let validInput;

  before(async function () {
    votingCircuit = await wasmTester("circuit/voting.circom");
    poseidon = await buildPoseidon();
  });

  beforeEach(function () {
    // Initialize valid input based on input.json
    validInput = {
      privateKey: "111",
      root: "172702405816516791996779728912308790882282610188111072512380034048458433129",
      proposalId: "0",
      vote: "1",
      pathElements: [
        "3370092681714607727019534888747304108045661953819543369463810453568040251648",
        "11117482755699627218224304590393929490559713427701237904426421590969988571596",
        "243824512512378969722345678901238764509182734690128374561290347612837465109",
        "982374598237450982374509283745098237450982374509823745098237450982374509823",
        "847523984750239847509238475098237450982374509823745098237450982374509823745",
        "182374598237450982374509823745098237450982374509823745098237450982374509823",
        "982374598237450982374509823745098237450982374509823745098237450982374509823",
        "237450982374509823745098237450982374509823745098237450982374509823745098237",
        "450982374509823745098237450982374509823745098237450982374509823745098237450",
        "823745098237450982374509823745098237450982374509823745098237450982374509823",
        "982374509823745098237450982374509823745098237450982374509823745098237450982",
        "374509823745098237450982374509823745098237450982374509823745098237450982374",
        "509823745098237450982374509823745098237450982374509823745098237450982374509",
        "823745098237450982374509823745098237450982374509823745098237450982374509823",
        "745098237450982374509823745098237450982374509823745098237450982374509823745",
        "098237450982374509823745098237450982374509823745098237450982374509823745098",
        "237450982374509823745098237450982374509823745098237450982374509823745098237",
        "450982374509823745098237450982374509823745098237450982374509823745098237450",
        "823745098237450982374509823745098237450982374509823745098237450982374509823",
        "982374509823745098237450982374509823745098237450982374509823745098237450982"
      ],
      pathIndices: [
        "0", "0", "1", "0", "1", "0", "1", "0", "1", "0",
        "1", "0", "1", "0", "1", "0", "1", "0", "1", "0"
      ]
    };
  });

  it("Should generate witness successfully with valid input", async function () {
    const witness = await votingCircuit.calculateWitness(validInput);
    await votingCircuit.checkConstraints(witness);
  });

  it("Should compute correct nullifier and hashedVote", async function () {
    // Compute expected values using Poseidon
    const privateKey = BigInt(validInput.privateKey);
    const root = BigInt(validInput.root);
    const proposalId = BigInt(validInput.proposalId);
    const vote = BigInt(validInput.vote);

    // Compute expected nullifier
    const nullifier = poseidon.F.toString(poseidon([root, privateKey, proposalId]));

    // Compute expected hashedVote
    const hashedVote = poseidon.F.toString(poseidon([privateKey, vote]));

    // Get circuit outputs
    const witness = await votingCircuit.calculateWitness(validInput);
    const circuitNullifier = await votingCircuit.readWitnessSignal(witness, "main.nullifier");
    const circuitHashedVote = await votingCircuit.readWitnessSignal(witness, "main.hashedVote");

    // Check against expected values
    assert.equal(circuitNullifier.toString(), nullifier);
    assert.equal(circuitHashedVote.toString(), hashedVote);
  });

  it("Should fail with invalid Merkle path elements", async function () {
    const invalidInput = { ...validInput };
    invalidInput.pathElements[0] = "12345"; // Corrupt path element
    try {
      await votingCircuit.calculateWitness(invalidInput);
      assert.fail("Expected an error");
    } catch (err) {
      assert.include(err.message, "Assert Failed");
    }
  });

  it("Should fail with non-binary path index", async function () {
    const invalidInput = { ...validInput };
    invalidInput.pathIndices[0] = "2"; // Invalid index
    try {
      await votingCircuit.calculateWitness(invalidInput);
      assert.fail("Expected an error");
    } catch (err) {
      assert.include(err.message, "s * (1 - s) === 0");
    }
  });

  it("Should fail with incorrect pathElements length", async function () {
    const invalidInput = { ...validInput };
    invalidInput.pathElements = invalidInput.pathElements.slice(0, 19); // Too few elements
    try {
      await votingCircuit.calculateWitness(invalidInput);
      assert.fail("Expected an error");
    } catch (err) {
      assert.include(err.message, "Not enough values for input signal pathElements");
    }
  });

  it("Should fail with incorrect privateKey", async function () {
    const invalidInput = { ...validInput };
    invalidInput.privateKey = "112"; // Incorrect private key
    try {
      await votingCircuit.calculateWitness(invalidInput);
      assert.fail("Expected an error");
    } catch (err) {
      assert.include(err.message, "Assert Failed");
    }
  });

  it("Should generate different nullifier for different proposalId", async function () {
    const modifiedInput = { ...validInput };
    modifiedInput.proposalId = "1"; // Change proposalId

    const originalWitness = await votingCircuit.calculateWitness(validInput);
    const modifiedWitness = await votingCircuit.calculateWitness(modifiedInput);

    const originalNullifier = await votingCircuit.readWitnessSignal(originalWitness, "main.nullifier");
    const modifiedNullifier = await votingCircuit.readWitnessSignal(modifiedWitness, "main.nullifier");

    assert.notEqual(modifiedNullifier.toString(), originalNullifier.toString());
  });

  it("Should generate different hashedVote for different vote", async function () {
    const modifiedInput = { ...validInput };
    modifiedInput.vote = "2"; // Change vote

    const originalWitness = await votingCircuit.calculateWitness(validInput);
    const modifiedWitness = await votingCircuit.calculateWitness(modifiedInput);

    const originalHashedVote = await votingCircuit.readWitnessSignal(originalWitness, "main.hashedVote");
    const modifiedHashedVote = await votingCircuit.readWitnessSignal(modifiedWitness, "main.hashedVote");

    assert.notEqual(modifiedHashedVote.toString(), originalHashedVote.toString());
  });
});