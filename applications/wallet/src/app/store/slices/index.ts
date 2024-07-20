import { walletReducers as baseWalletReducers } from '@proton/wallet';

import { apiWalletTransactionDataReducer } from './apiWalletTransactionData';
import { bitcoinAddressHighestIndexReducer } from './bitcoinAddressHighestIndex';
import { countriesByProviderReducer } from './countriesByProvider';
import { exchangeRateReducer } from './exchangeRate';
import { fiatCurrenciesReducer } from './fiatCurrencies';
import { fiatCurrenciesByProviderReducer } from './fiatCurrenciesByProvider';
import { gatewaysPublicApiKeysReducer } from './gatewaysPublicApiKeys';
import { paymentMethodsByProviderReducer } from './paymentMethodByProvider';
import { quotesByProviderReducer } from './quotesByProvider';
import { userEligibilityReducer } from './userEligibility';

export { apiWalletTransactionDataThunk, selectApiWalletTransactionData } from './apiWalletTransactionData';
export { bitcoinAddressHighestIndexThunk, selectBitcoinAddressHighestIndex } from './bitcoinAddressHighestIndex';
export { exchangeRateThunk, selectExchangeRate } from './exchangeRate';
export { fiatCurrenciesThunk, selectSortedFiatCurrencies as selectFiatCurrencies } from './fiatCurrencies';
export { selectGatewaysPublicApiKeys, gatewaysPublicApiKeysThunk } from './gatewaysPublicApiKeys';
export { selectUserEligibility, userEligibilityThunk } from './userEligibility';

export const walletReducers = {
    ...exchangeRateReducer,
    ...baseWalletReducers,
    ...apiWalletTransactionDataReducer,
    ...bitcoinAddressHighestIndexReducer,
    ...fiatCurrenciesReducer,
    ...fiatCurrenciesByProviderReducer,
    ...countriesByProviderReducer,
    ...paymentMethodsByProviderReducer,
    ...quotesByProviderReducer,
    ...gatewaysPublicApiKeysReducer,
    ...userEligibilityReducer,
};
