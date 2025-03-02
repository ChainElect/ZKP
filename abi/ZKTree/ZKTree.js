export const ZKTree_ABI = [
    [
        {
          "inputs": [
            { "internalType": "uint32", "name": "_levels", "type": "uint32" },
            { "internalType": "contract IHasher", "name": "_hasher", "type": "address" },
            { "internalType": "contract IVerifier", "name": "_verifier", "type": "address" }
          ],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            { "indexed": true, "internalType": "bytes32", "name": "commitment", "type": "bytes32" },
            { "indexed": false, "internalType": "uint32", "name": "leafIndex", "type": "uint32" },
            { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
          ],
          "name": "Commit",
          "type": "event"
        },
        {
          "inputs": [],
          "name": "FIELD_SIZE",
          "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "ROOT_HISTORY_SIZE",
          "outputs": [{ "internalType": "uint32", "name": "", "type": "uint32" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "ZERO_VALUE",
          "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
          "name": "commitments",
          "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "currentRootIndex",
          "outputs": [{ "internalType": "uint32", "name": "", "type": "uint32" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
          "name": "filledSubtrees",
          "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "getLastRoot",
          "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            { "internalType": "uint256", "name": "_left", "type": "uint256" },
            { "internalType": "uint256", "name": "_right", "type": "uint256" }
          ],
          "name": "hashLeftRight",
          "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "hasher",
          "outputs": [{ "internalType": "contract IHasher", "name": "", "type": "address" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{ "internalType": "bytes32", "name": "_root", "type": "bytes32" }],
          "name": "isKnownRoot",
          "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "levels",
          "outputs": [{ "internalType": "uint32", "name": "", "type": "uint32" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "nextIndex",
          "outputs": [{ "internalType": "uint32", "name": "", "type": "uint32" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
          "name": "nullifiers",
          "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
          "name": "roots",
          "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{ "internalType": "bytes32", "name": "newRoot", "type": "bytes32" }],
          "name": "updateRoot",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "verifier",
          "outputs": [{ "internalType": "contract IVerifier", "name": "", "type": "address" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{ "internalType": "uint256", "name": "i", "type": "uint256" }],
          "name": "zeros",
          "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
          "stateMutability": "pure",
          "type": "function"
        }
      ]      
];

export const ZKTree_ADDRESS = "0xdF3B17173a0525A7C5031774025f5C6479152e1b";