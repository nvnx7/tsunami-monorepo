import { ethers } from 'ethers';
import { type BigNumberish } from 'ethers';
const { BigNumber, utils } = ethers;

export const BN = BigNumber.from;
export const parseUnits = utils.parseUnits;
export const parseEther = utils.parseEther;
export const formatUnits = utils.formatUnits;
export const formatEther = utils.formatEther;
export const toChecksumAddress = utils.getAddress;

export const formatUnitsRounded = (value: BigNumberish, decimals: number, roundTo: number = 4) => {
  const formatted = formatUnits(value, decimals);
  return Number(formatted).toFixed(roundTo);
};

export const formatEtherRounded = (value: BigNumberish, roundTo: number = 4) => {
  return formatUnitsRounded(value, 18, roundTo);
};

export const equals = (value: BigNumberish, otherValue: BigNumberish) => {
  return BN(value).eq(otherValue);
};

export const toFixedHex = (n: BigNumberish, nBytes: number = 32) => {
  const hex = BN(n).toHexString();

  // Handle negative numbers
  if (hex[0] === '-') {
    return '-' + utils.hexZeroPad(hex.slice(1), nBytes);
  }

  return utils.hexZeroPad(hex, nBytes);
};

export const randomBN = (nBytes: number = 32) => BN(utils.randomBytes(nBytes));

export const randomHex = (nBytes: number) => {
  return utils.hexlify(utils.randomBytes(nBytes));
};

export const abbreviateHex = (hex: string, length: number = 9) => {
  if (!hex) return '';
  const startLen = Math.ceil(length / 2) + 1;
  const endLen = Math.floor(length / 2) - 1;

  return hex.slice(0, startLen) + '...' + hex.slice(-endLen);
};

export const stringifyBigInts = (v: BigNumberish | any): any => {
  if (BigNumber.isBigNumber(v)) {
    return v.toString();
  } else if (Array.isArray(v)) {
    return v.map(stringifyBigInts);
  } else if (typeof v === 'object') {
    const res: any = {};
    for (let key in v) {
      res[key] = stringifyBigInts(v[key]);
    }
    return res;
  }
  return BigNumber.from(v).toString();
};

export const hexifyBigInts = (v: BigNumberish | any): any => {
  if (BigNumber.isBigNumber(v)) {
    return v.toHexString();
  } else if (Array.isArray(v)) {
    return v.map(hexifyBigInts);
  } else if (typeof v === 'object') {
    const res: any = {};
    for (let key in v) {
      res[key] = hexifyBigInts(v[key]);
    }
    return res;
  }
  return BigNumber.from(v).toHexString();
};

export const isValidAddress = (address?: string) => {
  if (!address) return false;
  return utils.isAddress(address);
};

export const latestBlockTimestamp = async (provider: ethers.providers.BaseProvider) => {
  return provider.getBlock('latest').then((block) => block.timestamp);
};
