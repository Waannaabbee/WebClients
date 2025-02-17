import { type FC } from 'react';

import { ExtraPassword } from '@proton/pass/components/Settings/ExtraPassword';
import { LockSettings } from '@proton/pass/components/Settings/Lock';

export const Security: FC = () => [<LockSettings key="lock" />, <ExtraPassword key="extra-pwd" />];
