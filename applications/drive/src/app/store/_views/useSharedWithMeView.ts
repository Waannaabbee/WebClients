import { useCallback, useEffect } from 'react';

import { c } from 'ttag';

import { useNotifications } from '@proton/components/hooks';
import { useLoading } from '@proton/hooks';
import { SORT_DIRECTION } from '@proton/shared/lib/constants';

import { sendErrorReport } from '../../utils/errorHandling';
import { EnrichedError } from '../../utils/errorHandling/EnrichedError';
import { useLinksListing } from '../_links';
import { usePendingInvitationsListing } from '../_links/useLinksListing/usePendingInvitationsListing';
import { useUserSettings } from '../_settings';
import { useShareInvitation } from '../_shares';
import { useLoadLinksShareInfo } from '../_shares/useLoadLinksShareInfo';
import { useAbortSignal, useMemoArrayNoMatterTheOrder, useSortingWithDefault } from './utils';
import type { SortField } from './utils/useSorting';

const DEFAULT_SORT = {
    sortField: 'name' as SortField,
    sortOrder: SORT_DIRECTION.ASC,
};

/**
 * useSharedWithMeView provides data for shared with me links view (file browser of shared links).
 * @params {string} shareId
 * @params {boolean} disabledByFF, This is used to prevent loading on InitContainer if the flag is enabled.
 * Context is that we want to show the section if user have FF disabled for sharing by have item shared with him.
 * TODO: This should be removed after full rollout
 */
export default function useSharedWithMeView(shareId: string) {
    const [isLoading, withLoading] = useLoading(true);
    const [isPendingLoading, withPendingLoading] = useLoading(true);
    const linksListing = useLinksListing();
    const { acceptInvitation, rejectInvitation } = useShareInvitation();
    const { createNotification } = useNotifications();
    const {
        pendingInvitations,
        removePendingInvitation,
        getPendingInvitation,
        updatePendingInvitation,
        loadPendingInvitations,
    } = usePendingInvitationsListing();

    const loadSharedWithMeLinks = useCallback(async (signal: AbortSignal) => {
        await linksListing.loadLinksSharedWithMeLink(signal);
    }, []); //TODO: No deps params as too much work needed in linksListing
    const abortSignal = useAbortSignal([]);
    const { links: sharedLinks, isDecrypting } = linksListing.getCachedSharedWithMeLink(abortSignal);

    const cachedSharedLinks = useMemoArrayNoMatterTheOrder(sharedLinks);

    const { layout } = useUserSettings();

    const { isLoading: isShareInfoLoading, linksWithShareInfo } = useLoadLinksShareInfo({
        shareId,
        links: cachedSharedLinks,
        areLinksLoading: isDecrypting || isLoading,
    });
    const { sortedList, sortParams, setSorting } = useSortingWithDefault(
        isShareInfoLoading ? cachedSharedLinks : linksWithShareInfo,
        DEFAULT_SORT
    );

    const acceptPendingInvitation = async (invitationId: string) => {
        const abortSignal = new AbortController().signal;
        const pendingInvitation = getPendingInvitation(invitationId);
        await acceptInvitation(abortSignal, pendingInvitation)
            .then((response) => {
                if (response?.Code !== 1000) {
                    throw new EnrichedError(c('Notification').t`Failed to accept share invitation`, {
                        tags: {
                            volumeId: pendingInvitation.share.volumeId,
                            shareId: pendingInvitation.share.shareId,
                            linkId: pendingInvitation.link.linkId,
                            invitationId,
                        },
                    });
                }
            })
            .catch((error) => {
                sendErrorReport(error);
                createNotification({
                    type: 'error',
                    text: error.message,
                });
                throw error;
            });

        // We don't have events yet, so we need to refresh the list
        await linksListing.loadLinksSharedWithMeLink(abortSignal, true);
        removePendingInvitation(invitationId);
        createNotification({
            type: 'success',
            text: c('Notification').t`Share invitation accepted successfully`,
        });
    };

    const rejectPendingInvitation = async (invitationId: string) => {
        // When rejecting an invitation, we can optimistically remove it, and if any issue occurs, we add it back.
        const pendingInvitation = getPendingInvitation(invitationId);
        removePendingInvitation(invitationId);
        await rejectInvitation(new AbortController().signal, invitationId)
            .then((response) => {
                if (response?.Code !== 1000) {
                    throw new EnrichedError(c('Notification').t`Failed to reject share invitation`, {
                        tags: {
                            volumeId: pendingInvitation.share.volumeId,
                            shareId: pendingInvitation.share.shareId,
                            linkId: pendingInvitation.link.linkId,
                            invitationId,
                        },
                    });
                }
            })
            .catch((err) => {
                createNotification({
                    type: 'error',
                    text: err.message,
                });
                // Adding invite back if any issue happened
                if (pendingInvitation) {
                    updatePendingInvitation(pendingInvitation);
                }
                throw err;
            });
        createNotification({
            type: 'success',
            text: c('Notification').t`Share invitation declined`,
        });
    };

    useEffect(() => {
        void withLoading(async () => loadSharedWithMeLinks(abortSignal)).catch(sendErrorReport);
        void withPendingLoading(async () => loadPendingInvitations(abortSignal)).catch(sendErrorReport);
    }, []);
    return {
        layout,
        items: sortedList,
        sortParams,
        setSorting,
        pendingInvitations: [...pendingInvitations.values()],
        acceptPendingInvitation,
        rejectPendingInvitation,
        isLoading: isLoading || isPendingLoading || isDecrypting || isShareInfoLoading,
    };
}
