import { type FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Switch } from 'react-router-dom';

import { useClient } from 'proton-pass-web/app/Context/ClientProvider';
import { Monitor } from 'proton-pass-web/app/Views/Monitor/Monitor';
import { c } from 'ttag';

import { Button } from '@proton/atoms/Button';
import { Hamburger } from '@proton/components';
import { useToggle } from '@proton/components/hooks';
import { BulkSelectProvider } from '@proton/pass/components/Bulk/BulkSelectProvider';
import { useConnectivityBar } from '@proton/pass/components/Core/ConnectivityProvider';
import { InviteProvider } from '@proton/pass/components/Invite/InviteProvider';
import { ItemsProvider } from '@proton/pass/components/Item/Context/ItemsProvider';
import { ItemActionsProvider } from '@proton/pass/components/Item/ItemActionsProvider';
import { Items } from '@proton/pass/components/Item/Items';
import { Sidebar } from '@proton/pass/components/Layout/Section/Sidebar';
import { OnboardingProvider } from '@proton/pass/components/Onboarding/OnboardingProvider';
import { OrganizationProvider } from '@proton/pass/components/Organization/OrganizationProvider';
import { PasswordProvider } from '@proton/pass/components/Password/PasswordProvider';
import { SecureLinks } from '@proton/pass/components/SecureLink/SecureLinks';
import { SpotlightProvider } from '@proton/pass/components/Spotlight/SpotlightProvider';
import { VaultActionsProvider } from '@proton/pass/components/Vault/VaultActionsProvider';
import { authStore } from '@proton/pass/lib/auth/store';
import { clientOffline } from '@proton/pass/lib/client';
import { offlineResume } from '@proton/pass/store/actions';
import { offlineResumeRequest } from '@proton/pass/store/actions/requests';
import { selectRequestInFlight } from '@proton/pass/store/selectors';
import { getLocalIDPath } from '@proton/shared/lib/authentication/pathnameHelper';

import { ExtensionInstallBar } from './Header/ExtensionInstallBar';
import { Header } from './Header/Header';
import { LinuxUpdateBar } from './Header/LinuxUpdateBar';
import { Onboarding } from './Onboarding/Onboarding';
import { Settings } from './Settings/Settings';
import { Menu } from './Sidebar/Menu';

const MainSwitch: FC = () => {
    const dispatch = useDispatch();
    const client = useClient();
    const offline = clientOffline(client.state.status);
    const offlineResuming = useSelector(selectRequestInFlight(offlineResumeRequest()));

    const { state: expanded, toggle } = useToggle();

    const connectivityBar = useConnectivityBar((online) => ({
        className: offline ? 'bg-weak border-top' : 'bg-danger',
        hidden: online && !offline,
        text: offline ? (
            <div className="flex items-center gap-2">
                <span>{c('Info').t`Offline mode`}</span>

                <Button
                    className="text-sm"
                    onClick={() => dispatch(offlineResume.intent({ localID: authStore.getLocalID() }))}
                    shape="underline"
                    size="small"
                    loading={offlineResuming}
                    disabled={offlineResuming}
                >
                    {offlineResuming ? c('Info').t`Reconnecting` : c('Info').t`Reconnect`}
                </Button>
            </div>
        ) : undefined,
    }));

    return (
        <div className="content-container flex flex-1 shrink-0 flex-column">
            {BUILD_TARGET === 'linux' && <LinuxUpdateBar />}
            {BUILD_TARGET === 'web' && <ExtensionInstallBar />}
            <div className="flex flex-row flex-nowrap overflow-hidden flex-1 relative w-full h-full anime-fade-in">
                <Sidebar expanded={expanded} onToggle={toggle}>
                    <Menu onToggle={toggle} />
                </Sidebar>

                <Route path={`/${getLocalIDPath(client.state.localID)}`}>
                    {(route) => (
                        <main id="main" className="content flex-1 overflow-hidden">
                            <div className="flex flex-nowrap flex-column h-full">
                                <Header hamburger={<Hamburger expanded={expanded} onToggle={toggle} />} />

                                <div className="flex items-center justify-center flex-nowrap w-full h-full">
                                    {route.match && (
                                        <Switch>
                                            <Route
                                                exact
                                                path={`${route.match.path}/onboarding`}
                                                component={Onboarding}
                                            />
                                            <Route path={`${route.match.path}/monitor`} component={Monitor} />
                                            <Route exact path={`${route.match.path}/settings`} component={Settings} />
                                            <Route path={`${route.match.path}/secure-links`} component={SecureLinks} />
                                            <Route component={Items} />
                                        </Switch>
                                    )}
                                </div>
                            </div>
                        </main>
                    )}
                </Route>
            </div>
            {connectivityBar}
        </div>
    );
};

export const Main: FC = () => (
    <OrganizationProvider>
        <ItemsProvider>
            <BulkSelectProvider>
                <ItemActionsProvider>
                    <InviteProvider>
                        <VaultActionsProvider>
                            <PasswordProvider>
                                <SpotlightProvider>
                                    <OnboardingProvider>
                                        <MainSwitch />
                                    </OnboardingProvider>
                                </SpotlightProvider>
                            </PasswordProvider>
                        </VaultActionsProvider>
                    </InviteProvider>
                </ItemActionsProvider>
            </BulkSelectProvider>
        </ItemsProvider>
    </OrganizationProvider>
);
