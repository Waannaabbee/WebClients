import { useEffect } from 'react';

import type {
    WasmApiWallet,
    WasmApiWalletAccount,
    WasmFiatCurrencySymbol,
    WasmNetwork,
    WasmProtonWalletApiClient,
    WasmUserSettings,
    WasmWallet,
} from '@proton/andromeda';
import { useGetAddresses } from '@proton/components/hooks/useAddresses';
import useAuthentication from '@proton/components/hooks/useAuthentication';
import { useGetOrganization } from '@proton/components/hooks/useOrganization';
import { useUser } from '@proton/components/hooks/useUser';
import { useGetUserKeys } from '@proton/components/hooks/useUserKeys';
import { getDecryptedAddressKeysHelper } from '@proton/shared/lib/keys';

import { WalletType } from '..';
import { encryptWalletData } from '../utils/crypto';
import { POOL_FILLING_THRESHOLD } from '../utils/email-integration';
import { getDefaultWalletName } from '../utils/wallet';

const DEFAULT_ACCOUNT_LABEL = 'Primary Account';
const DEFAULT_PURPOSE = 84;
const FIRST_INDEX = 0;

// Flag to tell the API the wallet was autocreated
const WALLET_AUTOCREATE_FLAG = true;

let userWalletSettings: WasmUserSettings;
let wasm: typeof import('@proton/andromeda');

/**
 * Utility hook creating a wallet if user don't have any
 *
 * Requiremenents
 * - this hook needs to be called inside ExtendedApiContext (see @proton/wallet/contexts/ExtendedApiContext)
 * - this hook need to be called inside a Redux context which walletReducers (see @proton/wallet/store/slices/index.ts)
 *
 * Note:
 * - For now we create a new wallet for any user without one. Later a field will be introduced by the API so that we can filter only user that never had a wallet
 */
export const useWalletAutoCreate = (
    { higherLevelPilot = true, configUrl = '' }: { higherLevelPilot?: boolean; configUrl: string } = { configUrl: '' }
) => {
    const getUserKeys = useGetUserKeys();
    const getOrganization = useGetOrganization();
    const getAddresses = useGetAddresses();

    const [user] = useUser();
    const authentication = useAuthentication();

    const getWalletApi = async () => {
        return new wasm.WasmProtonWalletApiClient(authentication.UID, window.location.origin, configUrl).clients();
    };

    const defaultDefaultScriptType = () => wasm.WasmScriptType.NativeSegwit;

    const enableBitcoinViaEmail = async ({
        wallet,
        walletAccount,
        wasmWallet,
        walletApi,
        derivationPathParts,
    }: {
        wallet: WasmApiWallet;
        walletAccount: WasmApiWalletAccount;
        wasmWallet: WasmWallet;
        walletApi: ReturnType<WasmProtonWalletApiClient['clients']>;
        derivationPathParts: readonly [number, WasmNetwork, 0];
    }) => {
        const addresses = await getAddresses();
        const userKeys = await getUserKeys();

        const wasmAccount = new wasm.WasmAccount(
            wasmWallet,
            defaultDefaultScriptType(),
            wasm.WasmDerivationPath.fromParts(...derivationPathParts)
        );

        const [primaryAddress] = addresses;
        const [primaryAddressKey] = await getDecryptedAddressKeysHelper(
            primaryAddress.Keys,
            user,
            userKeys,
            authentication.getPassword()
        );

        await walletApi.wallet.addEmailAddress(wallet.ID, walletAccount.ID, primaryAddress.ID);

        const account = await import('../utils/account');

        // Fill bitcoin address pool
        const addressesPoolPayload = await account.generateBitcoinAddressesPayloadForPoolFilling({
            addressesToCreate: POOL_FILLING_THRESHOLD,
            startIndex: FIRST_INDEX,
            wasmAccount,
            addressKey: primaryAddressKey,
        });

        if (addressesPoolPayload?.[0]?.length) {
            await walletApi.bitcoin_address.addBitcoinAddress(wallet.ID, walletAccount.ID, addressesPoolPayload);
        }
    };

    const setupWalletAccount = async ({
        wallet,
        label,
        derivationPathParts,
        walletApi,
        fiatCurrency,
    }: {
        wallet: WasmApiWallet;
        label: string;
        derivationPathParts: readonly [number, WasmNetwork, 0];
        walletApi: ReturnType<WasmProtonWalletApiClient['clients']>;
        fiatCurrency: WasmFiatCurrencySymbol;
    }) => {
        const account = await walletApi.wallet.createWalletAccount(
            wallet.ID,
            wasm.WasmDerivationPath.fromParts(...derivationPathParts),
            label,
            defaultDefaultScriptType()
        );

        await walletApi.wallet.updateWalletAccountFiatCurrency(wallet.ID, account.Data.ID, fiatCurrency);

        return account;
    };

    const autoCreateWallet = async () => {
        try {
            const walletApi = await getWalletApi();

            const userKeys = await getUserKeys();
            const network = await walletApi.network.getNetwork();

            const [primaryUserKey] = userKeys;

            const mnemonic = new wasm.WasmMnemonic(wasm.WasmWordCount.Words12).asString();
            const hasPassphrase = false;

            const compelledWalletName = getDefaultWalletName(false, []);

            // Encrypt wallet data
            const [
                [encryptedName, encryptedMnemonic, encryptedFirstAccountLabel],
                [walletKey, walletKeySignature, userKeyId],
            ] = await encryptWalletData([compelledWalletName, mnemonic, DEFAULT_ACCOUNT_LABEL], primaryUserKey);

            const wasmWallet = new wasm.WasmWallet(network, mnemonic, '');
            const fingerprint = wasmWallet.getFingerprint();

            const derivationPathParts = [DEFAULT_PURPOSE, network, FIRST_INDEX] as const;

            const { Wallet } = await walletApi.wallet.createWallet(
                encryptedName,
                false,
                WalletType.OnChain,
                hasPassphrase,
                userKeyId,
                walletKey,
                walletKeySignature,
                encryptedMnemonic,
                fingerprint,
                undefined,
                WALLET_AUTOCREATE_FLAG
            );

            const account = await setupWalletAccount({
                wallet: Wallet,
                label: encryptedFirstAccountLabel,
                derivationPathParts,
                walletApi,
                fiatCurrency: userWalletSettings.FiatCurrency,
            });

            await enableBitcoinViaEmail({
                wallet: Wallet,
                walletAccount: account.Data,
                wasmWallet,
                derivationPathParts,
                walletApi,
            });
        } catch (e) {
            console.error('Could not autocreate wallet from Mail', e);
        }
    };

    const shouldCreateWallet = async () => {
        try {
            if (!higherLevelPilot) {
                return false;
            }

            let isUserCompatible = user.isFree;

            if (!isUserCompatible) {
                const organization = await getOrganization();
                isUserCompatible = organization?.MaxMembers === 1;
            }

            if (!isUserCompatible) {
                return false;
            }

            // lazy load wasm here
            wasm = await import('@proton/andromeda');

            const walletApi = await getWalletApi();
            userWalletSettings = (await walletApi.settings.getUserSettings())[0];

            return !userWalletSettings.WalletCreated;
        } catch (e) {
            console.error('Could not check whether or not wallet autocreation is needed', e);
            return false;
        }
    };

    useEffect(() => {
        const run = async () => {
            if (await shouldCreateWallet()) {
                await autoCreateWallet();
            }
        };

        void run();
    }, []);
};
