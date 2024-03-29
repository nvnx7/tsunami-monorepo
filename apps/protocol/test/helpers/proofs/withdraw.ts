import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import MerkleTree from 'fixed-merkle-tree';
import { FIELD_SIZE, TREE_HEIGHT, ZERO_VALUE } from '../constants';
import { generateSnarkProofSolidity, poseidonHash, toFixedHex } from '../utils';

const { utils, BigNumber } = ethers;

function hashExtData({ recipient, withdrawAmount, relayer, fee, encryptedOutput }: any) {
  const abi = new utils.AbiCoder();

  const encodedData = abi.encode(
    [
      'tuple(address recipient,uint256 withdrawAmount,address relayer,uint256 fee,bytes encryptedOutput)',
    ],
    [
      {
        recipient: toFixedHex(recipient, 20),
        withdrawAmount: toFixedHex(withdrawAmount),
        relayer: toFixedHex(relayer, 20),
        fee: toFixedHex(fee),
        encryptedOutput,
      },
    ],
  );
  const hash = utils.keccak256(encodedData);
  return BigNumber.from(hash).mod(FIELD_SIZE);
}

async function buildMerkleTree(tsunami: Contract) {
  const filter = tsunami.filters.NewCommitment();
  const events = await tsunami.queryFilter(filter, 0);

  const leaves = events
    .sort((a, b) => a.args?.leafIndex - b.args?.leafIndex)
    .map((e) => toFixedHex(e.args?.commitment));
  return new MerkleTree(TREE_HEIGHT, leaves, {
    hashFunction: poseidonHash,
    zeroElement: ZERO_VALUE,
  });
}

async function generateProof({
  input,
  output,
  tree,
  withdrawAmount,
  fee,
  recipient,
  relayer,
}: any) {
  const circuit = 'withdraw';

  let inputPathIndices;
  let inputPathElements;

  if (input.amount > 0) {
    input.leafIndex = tree.indexOf(toFixedHex(input.commitment));
    if (input.leafIndex < 0) {
      throw new Error(`Input commitment ${toFixedHex(input.commitment)} was not found`);
    }
    inputPathIndices = input.leafIndex;
    inputPathElements = tree.path(input.leafIndex).pathElements;
  } else {
    inputPathIndices = 0;
    inputPathElements = new Array(tree.levels).fill(0);
  }

  const extData = {
    recipient: toFixedHex(recipient, 20),
    withdrawAmount: toFixedHex(withdrawAmount),
    relayer: toFixedHex(relayer, 20),
    fee: toFixedHex(fee),
    encryptedOutput: output.encrypt(),
  };

  const extDataHash = hashExtData(extData);
  const publicAmount = BigNumber.from(withdrawAmount).add(fee);

  const proofInput = {
    root: tree.root,
    extDataHash,
    publicAmount,
    // data for transaction inputs
    inStartTime: input.startTime,
    inStopTime: input.stopTime,
    inCheckpointTime: input.checkpointTime,
    inRate: input.rate,
    inSenderPublicKey: input.senderKeyPair.publicKey,
    inReceiverPrivateKey: input.receiverKeyPair.privateKey,
    inBlinding: input.blinding,
    inputNullifier: input.nullifier,
    inPathIndices: inputPathIndices,
    inPathElements: inputPathElements,
    // data for transaction outputs
    outCheckpointTime: output.checkpointTime,
    outputCommitment: output.commitment,
    outBlinding: output.blinding,
  };

  const { proof } = await generateSnarkProofSolidity(proofInput, circuit);

  const proofArgs = {
    proof,
    root: toFixedHex(proofInput.root),
    inputNullifier: toFixedHex(input.nullifier),
    outputCommitment: toFixedHex(output.commitment),
    extDataHash: toFixedHex(extDataHash),
    publicAmount: toFixedHex(publicAmount),
    checkpointTime: toFixedHex(output.checkpointTime),
  };

  return {
    extData,
    proofArgs,
  };
}

export async function prepareWithdraw({
  tsunami,
  input,
  output,
  fee = 0,
  recipient = 0,
  relayer = 0,
}: any) {
  const withdrawAmount = input.rate.mul(output.checkpointTime - input.checkpointTime).toString();

  const tree = await buildMerkleTree(tsunami);

  const { proofArgs, extData } = await generateProof({
    input,
    output,
    tree,
    withdrawAmount,
    fee,
    recipient,
    relayer,
  });

  return {
    proofArgs,
    extData,
  };
}
