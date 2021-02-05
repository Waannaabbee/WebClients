import { getAttendeeEmail } from 'proton-shared/lib/calendar/attendees';
import { ICAL_METHOD } from 'proton-shared/lib/calendar/constants';
import {
    createInviteIcs,
    generateEmailSubject,
    generateVtimezonesComponents,
    getHasUpdatedInviteData,
} from 'proton-shared/lib/calendar/integration/invite';
import { getHasAttendees } from 'proton-shared/lib/calendar/vcalHelper';
import { getIsAddressDisabled } from 'proton-shared/lib/helpers/address';
import { canonizeEmailByGuess } from 'proton-shared/lib/helpers/email';
import { GetVTimezones, Recipient } from 'proton-shared/lib/interfaces';
import { VcalAttendeeProperty, VcalVeventComponent } from 'proton-shared/lib/interfaces/calendar';
import { ContactEmail } from 'proton-shared/lib/interfaces/contacts';
import { SendPreferences } from 'proton-shared/lib/interfaces/mail/crypto';
import { RequireSome, SimpleMap } from 'proton-shared/lib/interfaces/utils';
import { SendIcsParams } from 'react-components/hooks/useSendIcs';
import { INVITE_ACTION_TYPES, InviteActions } from '../../../interfaces/Invite';

const {
    SEND_INVITATION,
    SEND_UPDATE,
    CHANGE_PARTSTAT,
    DECLINE_INVITATION,
    DECLINE_DISABLED,
    CANCEL_INVITATION,
    CANCEL_DISABLED,
    NONE,
} = INVITE_ACTION_TYPES;

const getAttendeesDiff = (newVevent: VcalVeventComponent, oldVevent: VcalVeventComponent) => {
    const normalizedNewEmails = (newVevent.attendee || []).map((attendee) =>
        canonizeEmailByGuess(getAttendeeEmail(attendee))
    );
    const normalizedOldEmails = (oldVevent.attendee || []).map((attendee) =>
        canonizeEmailByGuess(getAttendeeEmail(attendee))
    );
    const addedAttendees = newVevent.attendee?.filter((attendee) => {
        const normalizedNewEmail = canonizeEmailByGuess(getAttendeeEmail(attendee));
        return !normalizedOldEmails.includes(normalizedNewEmail);
    });
    const removedAttendees = oldVevent.attendee?.filter((attendee) => {
        const normalizedOldEmail = canonizeEmailByGuess(getAttendeeEmail(attendee));
        return !normalizedNewEmails.includes(normalizedOldEmail);
    });
    return { addedAttendees, removedAttendees };
};

export const getUpdatedSaveInviteActions = ({
    inviteActions,
    newVevent,
    oldVevent,
    hasModifiedDateTimes,
}: {
    inviteActions: InviteActions;
    newVevent: VcalVeventComponent;
    oldVevent?: VcalVeventComponent;
    hasModifiedDateTimes?: boolean;
}) => {
    const { type } = inviteActions;
    const hasNewAttendees = getHasAttendees(newVevent);
    const hasOldAttendees = oldVevent ? getHasAttendees(oldVevent) : false;
    if (type !== SEND_INVITATION) {
        return { ...inviteActions };
    }
    if (!oldVevent) {
        // it's a create event operation
        if (!hasNewAttendees) {
            // no need to send any invitation in this case
            return {
                ...inviteActions,
                type: NONE,
            };
        }
        return { ...inviteActions };
    }
    if (!hasNewAttendees && !hasOldAttendees) {
        // no need to send any invitation in this case
        return {
            ...inviteActions,
            type: NONE,
        };
    }
    const hasInviteDataModification = getHasUpdatedInviteData({ newVevent, oldVevent, hasModifiedDateTimes });
    const { addedAttendees, removedAttendees } = getAttendeesDiff(newVevent, oldVevent);
    const hasAddedAttendees = !!addedAttendees?.length;
    const hasRemovedAttendees = !!removedAttendees?.length;
    const hasRemovedAllAttendees = hasRemovedAttendees && removedAttendees?.length === oldVevent.attendee?.length;
    if (hasInviteDataModification) {
        return {
            ...inviteActions,
            type: hasOldAttendees ? SEND_UPDATE : SEND_INVITATION,
            addedAttendees,
            removedAttendees,
            hasRemovedAllAttendees,
        };
    }
    if (!hasAddedAttendees && !hasRemovedAttendees) {
        // no need to send any invitation in this case
        return {
            ...inviteActions,
            type: NONE,
        };
    }
    return { ...inviteActions, addedAttendees, removedAttendees, hasRemovedAllAttendees };
};

export const getUpdatedDeleteInviteActions = ({
    inviteActions,
    oldVevent,
}: {
    inviteActions: InviteActions;
    oldVevent?: VcalVeventComponent;
}) => {
    const { type, selfAddress } = inviteActions;
    const hasAttendees = oldVevent ? getHasAttendees(oldVevent) : false;
    const disabled = getIsAddressDisabled(selfAddress);
    if (type === CANCEL_INVITATION) {
        if (!hasAttendees) {
            return {
                ...inviteActions,
                type: NONE,
            };
        }
        if (disabled) {
            return {
                ...inviteActions,
                type: CANCEL_DISABLED,
            };
        }
    }
    if (type === DECLINE_INVITATION && disabled) {
        return {
            ...inviteActions,
            type: DECLINE_DISABLED,
        };
    }
    return { ...inviteActions };
};

// Remove attendees we cannot send to
const getSafeSendTo = (attendees: VcalAttendeeProperty[], map: SimpleMap<SendPreferences>) => {
    return attendees.reduce<RequireSome<Recipient, 'Address' | 'Name'>[]>((acc, attendee) => {
        const email = getAttendeeEmail(attendee);
        if (!map[email]?.error) {
            acc.push({
                Address: email,
                Name: attendee.parameters?.cn || email,
            });
        }
        return acc;
    }, []);
};

export const getSendIcsAction = ({
    vevent,
    cancelVevent,
    inviteActions,
    sendIcs,
    sendPreferencesMap,
    contactEmailsMap,
    prodId,
    getVTimezones,
    onRequestError,
    onReplyError,
    onCancelError,
}: {
    vevent?: VcalVeventComponent;
    cancelVevent?: VcalVeventComponent;
    inviteActions: InviteActions;
    sendIcs: (params: SendIcsParams) => Promise<void>;
    sendPreferencesMap: SimpleMap<SendPreferences>;
    contactEmailsMap: SimpleMap<ContactEmail>;
    getVTimezones: GetVTimezones;
    prodId: string;
    onRequestError: (e: Error) => void;
    onReplyError: (e: Error) => void;
    onCancelError: (e: Error) => void;
}) => async () => {
    const { type, selfAddress, selfAttendeeIndex, partstat, addedAttendees, removedAttendees } = inviteActions;
    if (!selfAddress) {
        throw new Error('Cannot reply without a self address');
    }
    if (getIsAddressDisabled(selfAddress)) {
        throw new Error('Cannot send from a disabled address');
    }
    const addressID = selfAddress.ID;
    const from = { Address: selfAddress.Email, Name: selfAddress.DisplayName || selfAddress.Email };
    const hasAddedAttendees = !!addedAttendees?.length;
    const hasRemovedAttendees = !!removedAttendees?.length;
    if (type === SEND_INVITATION) {
        try {
            if (!vevent) {
                throw new Error('Cannot build invite ics without the event component');
            }
            const { attendee: attendees } = vevent;
            const vtimezones = await generateVtimezonesComponents(vevent, getVTimezones);
            const inviteIcs = createInviteIcs({
                method: ICAL_METHOD.REQUEST,
                prodId,
                vevent,
                vtimezones,
            });
            if (!hasAddedAttendees && !hasRemovedAttendees && attendees?.length) {
                // it's a new invitation
                await sendIcs({
                    method: ICAL_METHOD.REQUEST,
                    ics: inviteIcs,
                    addressID,
                    from,
                    to: getSafeSendTo(attendees, sendPreferencesMap),
                    subject: generateEmailSubject(ICAL_METHOD.REQUEST, vevent, true),
                    sendPreferencesMap,
                    contactEmailsMap,
                });
            } else {
                // it's an existing event, but we're just adding or removing participants
                const promises = [];
                if (addedAttendees?.length) {
                    promises.push(
                        sendIcs({
                            method: ICAL_METHOD.REQUEST,
                            ics: inviteIcs,
                            addressID,
                            from,
                            to: getSafeSendTo(addedAttendees, sendPreferencesMap),
                            subject: generateEmailSubject(ICAL_METHOD.REQUEST, vevent, true),
                            sendPreferencesMap,
                            contactEmailsMap,
                        })
                    );
                }
                if (removedAttendees?.length) {
                    if (!cancelVevent) {
                        throw new Error('Cannot cancel invite ics without the old event component');
                    }
                    const cancelIcs = createInviteIcs({
                        method: ICAL_METHOD.CANCEL,
                        prodId,
                        vevent: cancelVevent,
                        attendeesTo: removedAttendees,
                        vtimezones,
                    });
                    promises.push(
                        sendIcs({
                            method: ICAL_METHOD.CANCEL,
                            ics: cancelIcs,
                            addressID,
                            from,
                            to: getSafeSendTo(removedAttendees, sendPreferencesMap),
                            subject: generateEmailSubject(ICAL_METHOD.CANCEL, vevent),
                            sendPreferencesMap,
                            contactEmailsMap,
                        })
                    );
                }
                await Promise.all(promises);
            }
            return;
        } catch (e) {
            onRequestError(e);
        }
    }
    if (type === SEND_UPDATE) {
        try {
            if (!vevent) {
                throw new Error('Cannot build invite ics without the event component');
            }
            const { attendee: attendees } = vevent;
            if (!selfAddress) {
                throw new Error('Cannot build request ics without organizer and attendees');
            }
            const vtimezones = await generateVtimezonesComponents(vevent, getVTimezones);
            const inviteIcs = createInviteIcs({
                method: ICAL_METHOD.REQUEST,
                prodId,
                vevent,
                vtimezones,
            });
            const addedAttendeesEmails = (addedAttendees || []).map((attendee) => getAttendeeEmail(attendee));
            const remainingAttendees = (attendees || []).filter(
                (attendee) => !addedAttendeesEmails.includes(getAttendeeEmail(attendee))
            );
            const promises = [];
            if (remainingAttendees.length) {
                promises.push(
                    sendIcs({
                        method: ICAL_METHOD.REQUEST,
                        ics: inviteIcs,
                        addressID,
                        from,
                        to: getSafeSendTo(remainingAttendees, sendPreferencesMap),
                        subject: generateEmailSubject(ICAL_METHOD.REQUEST, vevent, false),
                        sendPreferencesMap,
                        contactEmailsMap,
                    })
                );
            }
            if (addedAttendees?.length) {
                promises.push(
                    sendIcs({
                        method: ICAL_METHOD.REQUEST,
                        ics: inviteIcs,
                        addressID,
                        from,
                        to: getSafeSendTo(addedAttendees, sendPreferencesMap),
                        subject: generateEmailSubject(ICAL_METHOD.REQUEST, vevent, true),
                        sendPreferencesMap,
                        contactEmailsMap,
                    })
                );
            }
            if (removedAttendees?.length) {
                if (!cancelVevent) {
                    throw new Error('Cannot cancel invite ics without the old event component');
                }
                const cancelIcs = createInviteIcs({
                    method: ICAL_METHOD.CANCEL,
                    prodId,
                    vevent: cancelVevent,
                    attendeesTo: removedAttendees,
                    vtimezones,
                });
                promises.push(
                    sendIcs({
                        method: ICAL_METHOD.CANCEL,
                        ics: cancelIcs,
                        addressID,
                        from,
                        to: getSafeSendTo(removedAttendees, sendPreferencesMap),
                        subject: generateEmailSubject(ICAL_METHOD.CANCEL, vevent),
                        sendPreferencesMap,
                        contactEmailsMap,
                    })
                );
            }
            await Promise.all(promises);
            return;
        } catch (e) {
            onRequestError(e);
        }
    }
    if (type === CANCEL_INVITATION) {
        try {
            if (!cancelVevent) {
                throw new Error('Cannot cancel invite ics without the old event component');
            }
            const { attendee: attendees } = cancelVevent;
            if (!attendees?.length) {
                throw new Error('Cannot build cancel ics without attendees');
            }
            const vtimezones = await generateVtimezonesComponents(cancelVevent, getVTimezones);
            const cancelIcs = createInviteIcs({
                method: ICAL_METHOD.CANCEL,
                prodId,
                vevent: cancelVevent,
                attendeesTo: attendees,
                vtimezones,
            });
            await sendIcs({
                method: ICAL_METHOD.CANCEL,
                ics: cancelIcs,
                addressID,
                from,
                to: getSafeSendTo(attendees, sendPreferencesMap),
                subject: generateEmailSubject(ICAL_METHOD.CANCEL, cancelVevent),
                sendPreferencesMap,
                contactEmailsMap,
            });
        } catch (e) {
            onCancelError(e);
        }
    }
    if ([CHANGE_PARTSTAT, DECLINE_INVITATION].includes(type)) {
        try {
            if (!vevent) {
                throw new Error('Cannot build invite ics without the event component');
            }
            const { organizer } = vevent;
            if (selfAttendeeIndex === undefined || !vevent.attendee || !selfAddress || !organizer) {
                throw new Error('Missing invitation data');
            }
            const selfAttendee = vevent.attendee[selfAttendeeIndex];

            const organizerEmail = getAttendeeEmail(organizer);
            const selfAttendeeWithPartstat = {
                ...selfAttendee,
                parameters: {
                    ...selfAttendee.parameters,
                    partstat,
                },
            };
            const replyIcs = createInviteIcs({
                method: ICAL_METHOD.REPLY,
                prodId,
                vevent,
                attendeesTo: [selfAttendeeWithPartstat],
            });
            await sendIcs({
                method: ICAL_METHOD.REPLY,
                ics: replyIcs,
                addressID: selfAddress.ID,
                from: {
                    Address: selfAddress.Email,
                    Name: selfAddress.DisplayName || selfAddress.Email,
                },
                to: [{ Address: organizerEmail, Name: organizer.parameters?.cn || organizerEmail }],
                subject: generateEmailSubject(ICAL_METHOD.REPLY, vevent),
                sendPreferencesMap,
                contactEmailsMap,
            });
            return;
        } catch (e) {
            onReplyError(e);
        }
    }
};
