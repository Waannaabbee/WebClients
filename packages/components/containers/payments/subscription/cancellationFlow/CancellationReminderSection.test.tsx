import { screen } from '@testing-library/react';

import { renderWithProviders } from '@proton/components/containers/contacts/tests/render';
import { useFlag } from '@proton/components/containers/unleash';
import { useSubscription, useUser, useVPNServersCount } from '@proton/components/hooks';
import { APPS, PLANS, PLAN_NAMES, PLAN_TYPES } from '@proton/shared/lib/constants';

import { CancellationReminderSection } from './CancellationReminderSection';
import useCancellationFlow from './useCancellationFlow';

jest.mock('@proton/components/hooks/useUser');
const mockUseUser = useUser as jest.MockedFunction<any>;
jest.mock('@proton/components/hooks/useSubscription');
const mockUseSubscription = useSubscription as jest.MockedFunction<any>;
jest.mock('@proton/components/hooks/useVPNServersCount');
const mockUseVPNServersCount = useVPNServersCount as jest.MockedFunction<any>;

jest.mock('@proton/components/containers/unleash');
const mockUseFlag = useFlag as jest.MockedFunction<any>;

jest.mock('./useCancellationFlow');
const mockUseCancellationFlow = useCancellationFlow as jest.Mock;

const defaultUser = {
    ChargebeeUser: 2,
};

const defaultB2CSubscription = {
    Plans: [
        {
            Type: PLAN_TYPES.PLAN,
            Name: PLANS.MAIL,
        },
    ],
};

describe('Cancellation flow section', () => {
    beforeEach(() => {
        mockUseCancellationFlow.mockImplementation(() => {
            const originalModule = jest.requireActual('./useCancellationFlow');
            return originalModule.default();
        });

        // We want to enable the feature everywhere
        mockUseFlag.mockReturnValue(true);
        // We don't want to test the VPN count in the tests
        mockUseVPNServersCount.mockReturnValue([{ paid: { countries: 10 } }]);
    });

    it('Should render the CancellationReminderSection component', () => {
        mockUseUser.mockReturnValue([defaultUser, false]);
        mockUseSubscription.mockReturnValue([defaultB2CSubscription, false]);

        renderWithProviders(<CancellationReminderSection app={APPS.PROTONMAIL} />);
        expect(screen.getByTestId('cancellation-flow:heading')).toBeInTheDocument();
    });

    it.each([
        [PLANS.BUNDLE, PLAN_NAMES[PLANS.BUNDLE]],
        [PLANS.DRIVE, PLAN_NAMES[PLANS.DRIVE]],
        [PLANS.BUNDLE_PRO_2024, PLAN_NAMES[PLANS.BUNDLE_PRO_2024]],
    ])('Should adapt UI depending on the user plan', (plan, planName) => {
        mockUseUser.mockReturnValue([defaultUser, false]);
        mockUseSubscription.mockReturnValue([
            {
                Plans: [
                    {
                        Type: PLAN_TYPES.PLAN,
                        Name: plan,
                        MaxDomains: 10,
                        MaxCalendars: 10,
                    },
                ],
            },
            false,
        ]);

        renderWithProviders(<CancellationReminderSection app={APPS.PROTONMAIL} />);
        expect(screen.getByTestId('cancellation-flow:heading')).toBeInTheDocument();

        const keepButton = screen.getByTestId('cancellation-flow:keep-plan-button');
        expect(keepButton).toHaveTextContent(`Keep ${planName}`);
    });

    it('Should redirect to the dashboard for free users', () => {
        mockUseUser.mockReturnValue([{}, false]);
        mockUseSubscription.mockReturnValue([{}, false]);

        const spyRedirectDashboard = jest.fn();
        mockUseCancellationFlow.mockReturnValue({
            b2bAccess: false,
            b2cAccess: false,
            redirectToDashboard: spyRedirectDashboard,
        });

        renderWithProviders(<CancellationReminderSection app={APPS.PROTONMAIL} />);
        expect(spyRedirectDashboard).toHaveBeenCalled();
    });
});
