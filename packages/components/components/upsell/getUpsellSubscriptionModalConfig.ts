import { CYCLE, PLANS } from '@proton/shared/lib/constants';

import type { OpenCallbackProps } from '../..';
import { SUBSCRIPTION_STEPS } from '../..';

const getUpsellSubscriptionModalConfig = (upsellRef: string, step = SUBSCRIPTION_STEPS.CHECKOUT): OpenCallbackProps => {
    return {
        mode: 'upsell-modal', // hide the Free plan
        planIDs: { [PLANS.MAIL]: 1 },
        cycle: CYCLE.YEARLY,
        step,
        disablePlanSelection: step === SUBSCRIPTION_STEPS.CHECKOUT,
        maximumCycle: CYCLE.YEARLY,
        upsellRef,
        metrics: {
            source: 'upsells',
        },
    };
};

export default getUpsellSubscriptionModalConfig;
