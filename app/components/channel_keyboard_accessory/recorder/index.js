// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {createVoiceMessage} from 'app/actions/views/voice';

import Recorder from './recorder';

const mapDispatchToProps = {
    createVoiceMessage,
};

export default connect(null, mapDispatchToProps)(Recorder);
