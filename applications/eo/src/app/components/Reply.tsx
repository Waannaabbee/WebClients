import { useEffect } from 'react';
import { useHistory } from 'react-router';
import { Redirect, useRouteMatch } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Button, classnames, useApi } from '@proton/components';
import Main from 'proton-account/src/app/public/Main';
import { Recipient } from '@proton/shared/lib/interfaces';
import { c } from 'ttag';
import RecipientType from 'proton-mail/src/app/components/message/recipients/RecipientType';
import RecipientItem from 'proton-mail/src/app/components/message/recipients/RecipientItem';
import AttachmentsButton from 'proton-mail/src/app/components/attachment/AttachmentsButton';
import { loadEOMessage } from '../logic/eo/eoActions';
import { useOutsideMessage } from '../hooks/useOutsideMessage';
import { EOUrlParams } from '../helpers/eoUrl';

const Reply = () => {
    const history = useHistory();
    const api = useApi();
    const dispatch = useDispatch();

    const match = useRouteMatch<EOUrlParams>();
    const { id } = match.params;

    const { message, isStoreInitialized, decryptedToken, password, messageState } = useOutsideMessage({ id });

    const shouldRedirectToUnlock = (!password || !decryptedToken) && isStoreInitialized;

    useEffect(() => {
        const loadMessage = async (id: string) => {
            await dispatch(loadEOMessage({ api, token: decryptedToken, id, password }));
        };

        if (id && decryptedToken && password && isStoreInitialized && messageState === undefined) {
            loadMessage(id);
        }
    }, [decryptedToken, password, id, messageState, isStoreInitialized]);

    if (!id) {
        return <Redirect to="/" />;
    }

    if (shouldRedirectToUnlock) {
        return <Redirect to={`/${id}`} />;
    }

    if (!isStoreInitialized || !messageState) {
        return <>Loading</>;
    }

    const eoRecipient = { Name: message.Recipient, Address: message.Recipient } as Recipient;

    const from = <RecipientItem recipientOrGroup={{ recipient: eoRecipient }} isLoading={false} isOutside />;

    const to = (
        <RecipientItem recipientOrGroup={{ recipient: messageState.data?.Sender }} isLoading={false} isOutside />
    );

    const handleCancel = () => {
        history.push(`/message/${id}`);
    };

    return (
        <Main larger className="p1 mw52r">
            <div>
                <div className="flex flex-align-items-center mb1">
                    <h1 className="text-ellipsis m0" title={messageState.data?.Subject}>
                        {messageState.data?.Subject}
                    </h1>
                </div>
                <RecipientType
                    label={c('Label').t`From:`}
                    className={classnames([
                        'flex flex-align-items-start flex-nowrap mb0-5',
                        //! messageLoaded && 'flex-item-fluid',
                    ])}
                >
                    {from}
                </RecipientType>
                <RecipientType
                    label={c('Label').t`To:`}
                    className={classnames([
                        'flex flex-align-items-start flex-nowrap',
                        //! messageLoaded && 'flex-item-fluid',
                    ])}
                >
                    {to}
                </RecipientType>
            </div>
            <>COMPOSER</>
            <div>
                <Button size="large" color="weak" type="button" onClick={handleCancel}>
                    {c('Action').t`Cancel`}
                </Button>
                <AttachmentsButton
                    onAddAttachments={() => console.log('Add attachments')}
                    data-testid="eo-composer:attachment-button"
                />
                <Button size="large" color="norm" type="button" onClick={() => console.log('SEND')}>
                    {c('Action').t`Send`}
                </Button>
            </div>
        </Main>
    );
};

export default Reply;
