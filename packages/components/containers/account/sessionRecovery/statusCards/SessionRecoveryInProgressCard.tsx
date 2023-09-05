import { format } from 'date-fns';
import { c, msgid } from 'ttag';

import { Button } from '@proton/atoms';
import { dateLocale } from '@proton/shared/lib/i18n';
import clsx from '@proton/utils/clsx';

import { useModalState } from '../../../../components';
import { useSessionRecoveryGracePeriodHoursRemaining, useUser } from '../../../../hooks';
import ConfirmSessionRecoveryCancellationModal from '../ConfirmSessionRecoveryCancellationModal';
import SessionRecoveryStatusTitle from './SessionRecoveryStatusTitle';
import handWarningIcon from './hand-warning-icon.svg';
import lockIcon from './lock-icon.svg';

interface Props {
    className?: string;
}

const SessionRecoveryInProgressCard = ({ className }: Props) => {
    const [user] = useUser();
    const gracePeriodHoursRemaining = useSessionRecoveryGracePeriodHoursRemaining();
    const [confirmCancelModalProps, setConfirmCancelModalOpen, renderConfirmCancelModal] = useModalState();

    if (user.AccountRecovery === null || gracePeriodHoursRemaining === null) {
        return null;
    }

    const endDate = new Date(user.AccountRecovery.EndTime * 1000);
    const formattedDate = format(endDate, 'PP', { locale: dateLocale });

    const boldDate = <b key="bold-date">{formattedDate}</b>;

    return (
        <>
            {renderConfirmCancelModal && <ConfirmSessionRecoveryCancellationModal {...confirmCancelModalProps} />}
            <div className={clsx('max-w46e rounded-lg border', className)}>
                <div className="p-6 border-bottom border-weak">
                    <SessionRecoveryStatusTitle status="pending" />
                </div>
                <div className="p-6 border-bottom border-weak sm:flex flex-align-items-start flex-nowrap">
                    <img className="mb-2 sm:mb-0 sm:mr-4 flex-item-noshrink" src={lockIcon} alt="Lock icon" />
                    <div>
                        <h3 className="text-bold text-lg">
                            {c('Info').ngettext(
                                msgid`You can change your password in ${gracePeriodHoursRemaining} hour`,
                                `You can change your password in ${gracePeriodHoursRemaining} hours`,
                                gracePeriodHoursRemaining
                            )}
                        </h3>
                        <div>
                            {c('Info')
                                .jt`Password reset available from ${boldDate}. This gives you time to cancel any fraudulent requests.`}
                        </div>
                    </div>
                </div>
                <div className="p-6 sm:flex flex-align-items-start flex-nowrap">
                    <img
                        className="mb-2 sm:mb-0 sm:mr-4 flex-item-noshrink"
                        src={handWarningIcon}
                        alt="Hand warning icon"
                    />
                    <div>
                        <h3 className="text-bold text-lg">{c('Info').t`Didn’t make this request?`}</h3>
                        <div className="mb-4">
                            {c('Info').t`If you didn’t ask to reset your password, cancel the request now.`}
                        </div>
                        <Button
                            className="w-full sm:w-auto"
                            onClick={() => setConfirmCancelModalOpen(true)}
                            color="danger"
                            shape="outline"
                        >
                            {c('Action').t`Cancel password reset`}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SessionRecoveryInProgressCard;
