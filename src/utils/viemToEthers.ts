import { providers, Signer, utils } from 'ethers';
import type { WalletClient } from 'viem';

/**
 * Custom Ethers Signer that wraps a Viem WalletClient
 * This allows us to use wagmi's viem-based wallet with ethers v5
 */
class ViemSigner extends Signer {
  readonly provider?: providers.Provider;
  readonly walletClient: WalletClient;

  constructor(walletClient: WalletClient, provider?: providers.Provider) {
    super();
    this.walletClient = walletClient;
    this.provider = provider;
  }

  async getAddress(): Promise<string> {
    if (!this.walletClient.account) {
      throw new Error('No account connected');
    }
    // Viem returns lowercase addresses, but ethers expects checksummed addresses
    return utils.getAddress(this.walletClient.account.address);
  }

  async signMessage(message: string | utils.Bytes): Promise<string> {
    if (!this.walletClient.account) {
      throw new Error('No account connected');
    }

    const messageToSign = typeof message === 'string' ? message : utils.hexlify(message);
    const signature = await this.walletClient.signMessage({
      account: this.walletClient.account,
      message: messageToSign,
    });

    return signature;
  }

  async signTransaction(transaction: providers.TransactionRequest): Promise<string> {
    throw new Error('signTransaction not implemented - use sendTransaction instead');
  }

  async sendTransaction(transaction: providers.TransactionRequest): Promise<providers.TransactionResponse> {
    if (!this.walletClient.account || !this.walletClient.chain) {
      throw new Error('No account or chain connected');
    }

    // Convert ethers transaction to viem format
    const txRequest: any = {
      account: this.walletClient.account,
      to: transaction.to as `0x${string}`,
      value: transaction.value ? BigInt(transaction.value.toString()) : undefined,
      data: transaction.data as `0x${string}`,
      gas: transaction.gasLimit ? BigInt(transaction.gasLimit.toString()) : undefined,
      gasPrice: transaction.gasPrice ? BigInt(transaction.gasPrice.toString()) : undefined,
      nonce: transaction.nonce,
      chain: this.walletClient.chain,
    };

    // Send transaction using viem
    const hash = await this.walletClient.sendTransaction(txRequest);

    // Return ethers-compatible transaction response
    if (!this.provider) {
      throw new Error('Provider required to return transaction response');
    }

    // Wait for the transaction to be mined and return the response
    await this.provider.waitForTransaction(hash);
    return this.provider.getTransaction(hash);
  }

  connect(provider: providers.Provider): Signer {
    return new ViemSigner(this.walletClient, provider);
  }
}

/**
 * Convert a Viem WalletClient to an Ethers v5 Signer
 */
export function walletClientToSigner(walletClient: WalletClient): Signer {
  // Create a provider from the wallet client's chain RPC
  let provider: providers.Provider | undefined;

  if (walletClient.chain?.rpcUrls?.default?.http?.[0]) {
    provider = new providers.JsonRpcProvider(walletClient.chain.rpcUrls.default.http[0]);
  }

  return new ViemSigner(walletClient, provider);
}
