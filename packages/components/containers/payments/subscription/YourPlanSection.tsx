import type { APP_NAMES } from '@proton/shared/lib/constants';
import { APPS } from '@proton/shared/lib/constants';
import { ORGANIZATION_STATE } from '@proton/shared/lib/constants';
import { pick } from '@proton/shared/lib/helpers/object';
import { getHasVpnB2BPlan } from '@proton/shared/lib/helpers/subscription';
import { FREE_PLAN } from '@proton/shared/lib/subscription/freePlans';
import clsx from '@proton/utils/clsx';

import { Loader } from '../../../components';
import {
    useAddresses,
    useCalendars,
    useLoad,
    useOrganization,
    usePendingUserInvitations,
    usePlans,
    useSubscription,
    useUser,
    useVPNServersCount,
} from '../../../hooks';
import { SettingsSectionExtraWide, SettingsSectionWide } from '../../account';
import MozillaInfoPanel from '../../account/MozillaInfoPanel';
import { useSubscriptionModal } from './SubscriptionModalProvider';
// The import below is used for the docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type UpgradeVpnSection from './UpgradeVpnSection';
import { getCurrency, resolveUpsellsToDisplay } from './helpers';
import { SubscriptionPanel, UpsellPanels, UsagePanel } from './panels';
import PendingInvitationsPanel from './panels/PendingInvitationsPanel';

import './YourPlanSection.scss';

interface Props {
    app: APP_NAMES;
}

const YourPlanSection = ({ app }: Props) => {
    const [user] = useUser();
    const [plansResult, loadingPlans] = usePlans();
    const plans = plansResult?.plans;
    const freePlan = plansResult?.freePlan || FREE_PLAN;
    const [addresses] = useAddresses();
    const [calendars] = useCalendars();
    const [subscription, loadingSubscription] = useSubscription();
    const [organization, loadingOrganization] = useOrganization();
    const [serversCount, serversCountLoading] = useVPNServersCount();
    const [invites = []] = usePendingUserInvitations();
    const [openSubscriptionModal] = useSubscriptionModal();

    useLoad();

    const loading = loadingSubscription || loadingOrganization || loadingPlans || serversCountLoading;

    if (!subscription || !plans || loading) {
        return <Loader />;
    }

    const { isManagedByMozilla } = subscription;

    if (isManagedByMozilla) {
        return <MozillaInfoPanel />;
    }

    const currency = getCurrency(user, subscription, plans);
    const upsells = resolveUpsellsToDisplay({
        app,
        currency,
        subscription,
        plans,
        freePlan,
        serversCount,
        openSubscriptionModal,
        ...pick(user, ['canPay', 'isFree', 'hasPaidMail']),
    });

    const isVpnB2b = getHasVpnB2BPlan(subscription);
    /**
     * for VPN B2B, we display the upsells in {@link UpgradeVpnSection}
     */
    const isWalletEA = app === APPS.PROTONWALLET;
    const shouldRenderUpsells = !isVpnB2b && !isWalletEA;
    // VPN B2B plans must not have a usage panel
    const shouldRenderUsagePanel =
        (organization?.UsedMembers || 0) > 1 && !isVpnB2b && organization?.State === ORGANIZATION_STATE.ACTIVE;

    const shouldRenderPendingInvitation = Boolean(invites.length);
    const totalPanelsToDisplay = 1 + (+shouldRenderPendingInvitation || upsells.length) + +shouldRenderUsagePanel;

    // By default, for style consistency, we display every setting in `SettingsSectionWide`
    // But since 3 panels don't fit in this section (or are too tightly packed),
    // we use the extra wide one when we have > 2 panels to display
    const shouldRenderInLargeSection = totalPanelsToDisplay > 2;
    const SettingsSection = shouldRenderInLargeSection ? SettingsSectionExtraWide : SettingsSectionWide;

    // Either display pending invitations if any, or upsell(s)
    const invitationsOrUpsells = (() => {
        if (shouldRenderPendingInvitation) {
            return <PendingInvitationsPanel invites={invites} />;
        }
        if (shouldRenderUpsells) {
            return <UpsellPanels upsells={upsells} subscription={subscription} />;
        }
        return null;
    })();

    return (
        <SettingsSection>
            <div
                className={clsx(
                    shouldRenderInLargeSection ? 'grid-column-3' : 'grid-column-2',
                    'your-plan-section-container gap-8 pt-4'
                )}
                data-testid="dashboard-panels-container"
            >
                {/* Subcription details */}
                <SubscriptionPanel
                    app={app}
                    currency={currency}
                    subscription={subscription}
                    organization={organization}
                    user={user}
                    addresses={addresses}
                    vpnServers={serversCount}
                />

                {/* Usage for plans with >1 Members */}
                {shouldRenderUsagePanel && (
                    <UsagePanel addresses={addresses} calendars={calendars} organization={organization} user={user} />
                )}

                {invitationsOrUpsells}
            </div>
        </SettingsSection>
    );
};
export default YourPlanSection;
