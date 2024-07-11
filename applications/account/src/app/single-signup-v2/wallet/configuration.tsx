import { c } from 'ttag';

import { WalletLogo } from '@proton/components/components';
import { getSentinel } from '@proton/components/containers/payments/features/highlights';
import {
    FREE_WALLETS,
    FREE_WALLET_ACCOUNTS,
    FREE_WALLET_EMAIL,
    UNLIMITED_WALLETS,
    UNLIMITED_WALLET_ACCOUNTS,
    UNLIMITED_WALLET_EMAIL,
    VISIONARY_WALLETS,
    VISIONARY_WALLET_ACCOUNTS,
    VISIONARY_WALLET_EMAIL,
    WALLET_PLUS_WALLETS,
    WALLET_PLUS_WALLET_ACCOUNTS,
    WALLET_PLUS_WALLET_EMAIL,
    getBitcoinViaEmail,
    getVisionaryWallet,
    getWalletAccounts,
    getWalletEmailAddresses,
    getWallets,
} from '@proton/components/containers/payments/features/wallet';
import { PlanCardFeatureList } from '@proton/components/containers/payments/subscription/PlanCardFeatures';
import { APPS, CYCLE, PLANS, WALLET_APP_NAME, WALLET_SHORT_APP_NAME } from '@proton/shared/lib/constants';
import { Audience, PlansMap, VPNServersCountData } from '@proton/shared/lib/interfaces';
import isTruthy from '@proton/utils/isTruthy';

import { SignupType } from '../../signup/interfaces';
import Benefits, { BenefitItem } from '../Benefits';
import { planCardFeatureProps } from '../PlanCardSelector';
import { getBenefits, getGenericFeatures, getJoinString } from '../configuration/helper';
import { SignupConfiguration, SignupMode } from '../interface';
import setupAccount from '../mail/account-setup.svg';
import CustomStep from './CustomStep';

export const getWalletBenefits = (): BenefitItem[] => {
    return [
        {
            key: 1,
            text: c('pass_signup_2023: Info').t`End-to-end encryption`,
            icon: {
                name: 'lock' as const,
            },
        },
        {
            key: 2,
            text: c('pass_signup_2023: Info').t`Protected by Swiss privacy laws`,
            icon: {
                name: 'shield' as const,
            },
        },
        {
            key: 3,
            text: c('pass_signup_2023: Info').t`Open source and audited`,
            icon: {
                name: 'magnifier' as const,
            },
        },
        {
            key: 4,
            text: c('pass_signup_2023: Info').t`Works on all devices`,
            icon: {
                name: 'mobile' as const,
            },
        },
    ].filter(isTruthy);
};

export const getFreeWalletFeatures = () => {
    return [
        getWallets(FREE_WALLETS),
        getWalletAccounts(FREE_WALLET_ACCOUNTS),
        getWalletEmailAddresses(FREE_WALLET_EMAIL),
        getBitcoinViaEmail(),
    ];
};

export const getWalletPlusFeatures = () => {
    return [
        getWallets(WALLET_PLUS_WALLETS),
        getWalletAccounts(WALLET_PLUS_WALLET_ACCOUNTS),
        getWalletEmailAddresses(WALLET_PLUS_WALLET_EMAIL),
        getBitcoinViaEmail(),
        getSentinel(true),
    ];
};

export const getUnlimitedFeatures = () => {
    return [
        getWallets(UNLIMITED_WALLETS),
        getWalletAccounts(UNLIMITED_WALLET_ACCOUNTS),
        getWalletEmailAddresses(UNLIMITED_WALLET_EMAIL),
        getBitcoinViaEmail(),
        getSentinel(true),
    ];
};

export const getVisionaryFeatures = () => {
    return [
        getWallets(VISIONARY_WALLETS),
        getWalletAccounts(VISIONARY_WALLET_ACCOUNTS),
        getWalletEmailAddresses(VISIONARY_WALLET_EMAIL),
        getBitcoinViaEmail(),
        getSentinel(true),
        getVisionaryWallet(),
    ];
};

export const getWalletConfiguration = ({
    mode,
    audience,
    hideFreePlan,
    isLargeViewport,
}: {
    mode: SignupMode;
    audience: Audience.B2B | Audience.B2C;
    hideFreePlan: boolean;
    isLargeViewport: boolean;
    vpnServersCountData: VPNServersCountData;
    plansMap?: PlansMap;
}): SignupConfiguration => {
    const logo = <WalletLogo />;

    const title = c('wallet_signup_2024: Info').t`The easiest way to securely own, send, and receive Bitcoin`;
    const inviteTitle = c('wallet_signup_2024: Info').t`You have been invited to join ${WALLET_APP_NAME}`;
    const onboardingTitle = c('wallet_signup_2024: Info').t`Unlock ${WALLET_APP_NAME} premium features by upgrading`;

    const features = getGenericFeatures(isLargeViewport);

    const planCards: SignupConfiguration['planCards'] = {
        [Audience.B2B]: [],
        [Audience.B2C]: [
            !hideFreePlan && {
                plan: PLANS.FREE,
                subsection: <PlanCardFeatureList {...planCardFeatureProps} features={getFreeWalletFeatures()} />,
                type: 'standard' as const,
                guarantee: false,
            },
            {
                plan: PLANS.WALLET,
                subsection: <PlanCardFeatureList {...planCardFeatureProps} features={getWalletPlusFeatures()} />,
                type: 'best' as const,
                guarantee: true,
            },
            {
                plan: PLANS.BUNDLE,
                subsection: <PlanCardFeatureList {...planCardFeatureProps} features={getUnlimitedFeatures()} />,
                type: 'standard' as const,
                guarantee: true,
            },
            {
                plan: PLANS.VISIONARY,
                subsection: <PlanCardFeatureList {...planCardFeatureProps} features={getVisionaryFeatures()} />,
                type: 'standard' as const,
                guarantee: true,
            },
        ].filter(isTruthy),
    };

    const benefits = (() => {
        const benefitItems = getWalletBenefits();
        return (
            benefitItems && (
                <div>
                    <div className="text-lg text-semibold">{getBenefits(WALLET_APP_NAME)}</div>
                    <Benefits className="mt-5 mb-5" features={benefitItems} />
                    <div>{getJoinString(audience)}</div>
                </div>
            )
        );
    })();

    return {
        logo,
        title: {
            [SignupMode.Default]: title,
            [SignupMode.Onboarding]: onboardingTitle,
            [SignupMode.Invite]: inviteTitle,
            [SignupMode.MailReferral]: title,
        }[mode],
        features,
        benefits,
        planCards,
        audience,
        signupTypes: [SignupType.Email, SignupType.Username],
        generateMnemonic: false,
        defaults: {
            plan: PLANS.WALLET,
            cycle: CYCLE.YEARLY,
        },
        onboarding: {
            user: false,
            signup: true,
        },
        product: APPS.PROTONWALLET,
        shortProductAppName: WALLET_SHORT_APP_NAME,
        productAppName: WALLET_APP_NAME,
        setupImg: <img src={setupAccount} alt="" />,
        preload: (
            <>
                <link rel="prefetch" href={setupAccount} as="image" />
            </>
        ),
        CustomStep,
        cycles: [CYCLE.MONTHLY, CYCLE.YEARLY],
    };
};
