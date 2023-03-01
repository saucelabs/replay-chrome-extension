import React from "react";
import ConfigForm from "./ConfigForm";

import Credential from "./Credential";

class App extends React.Component {
  constructor(props) {
    super(props);
    // eslint-disable-next-line no-undef
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // eslint-disable-next-line no-undef
      chrome.storage.session.set({recording: request});
    });

    this.state = {
      token: false,
      region: 'us-west-1',
      suiteName: '',
      buildId: '',
      tags: '',
      jobId: '',
      platform: '',
      failed: false,
      errMsg: '',
      trigger: false,
    };
    this.handleCredential = this.handleCredential.bind(this);
    this.handleConfig = this.handleConfig.bind(this);
  }

  async componentDidMount() { 
    const token = await this.readStorage('token');
    this.setState({token: token});
  }

  async componentDidUpdate() {
    if (this.state.platform === '' || this.state.suiteName !== '' || this.state.jobId !== '' || this.state.errMsg !== '') {
      return;
    }

    const username = await this.readStorage('username');
    const accessKey = await this.readStorage('accessKey');
    const credential = btoa(`${username}:${accessKey}`);
    const recording = await this.readStorage('recording');
    this.setState({suiteName: JSON.parse(recording).title});

    let fileId;
    await this.uploadFile(recording, 'recordings.json', credential)
    .then(function (response) {
      fileId = response;
    })
    if (!fileId) {
      this.setState({trigger: false, failed: true, errMsg: 'failed to upload recording file'})
      return;
    }

    let configFileId;
    await this.uploadFile(JSON.stringify(this.composeConfig()), 'sauce-runner.json', credential)
    .then(function (response) {
      configFileId = response;
    })
    if (!configFileId) {
      this.setState({trigger: false, failed: true, errMsg: 'failed to upload config file'})
      return;
    }

    let runnerVersion;
    await this.getRunnerVersion(credential)
    .then(function (resp) {
      runnerVersion = resp;
    })

    let jobId;
    const storage = `storage:${fileId},storage:${configFileId}`;
    await this.startJob(credential, storage, runnerVersion).then(function (resp) {
      jobId = resp;
    })
    if (!jobId) {
      this.setState({trigger: false, failed: true, errMsg: 'failed to trigger a sauce job'})
      return;
    }
    this.setState({jobId: jobId})
    this.setState({platform: ''})
  }

  async getRunnerVersion(credential) {
    const url = `https://api.${this.state.region}.saucelabs.com/v1/testcomposer/frameworks/puppeteer-replay`
    return fetch(url, {
      headers: {
        Accept: '*/*',
        Authorization:
          'Basic ' + credential,
      },
    })
    .then((response) => response.json())
    .then((data) => {
      return data.version;
    })
    .catch((error) => {
      console.error('get file error:', error);
    });
  }

  async startJob(credential, storage, runnerVersion) {
    const data = {
      capabilities: {
        alwaysMatch: {
          app: storage,
          browserName: 'googlechrome',
          platformName: this.state.platform || 'Windows 10',
          'sauce:options': {
            devX: true,
            name: this.state.suiteName,
            build: this.state.buildId,
            tags: this.state.tags.split(','),
            _batch: {
              framework: 'puppeteer-replay',
              frameworkVersion: 'latest',
              runnerVersion: runnerVersion,
              testFile: this.state.suiteName,
              args: null,
              video_fps: 25,
            },
            idleTimeout: 9999,
            maxDuration: 10800,
            user_agent: 'chrome_extension',
          },
        },
      },
    };
    return fetch(`https://ondemand.${this.state.region}.saucelabs.com/wd/hub/session`, {
      method: 'POST',
      headers: {
        Accept: '*/*',
        Authorization: 'Basic ' + credential,
      },
      body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .then((data) => {
      return data.sessionId;
    })
    .catch((error) => {
      console.error('create job Error:', error);
    });
  }

  composeConfig() {
    return {
      sauce: {
        region: this.state.region,
      },
      suites: [
        {
          name: this.state.suiteName,
          recording: 'recordings.json',
          browserName: 'googlechrome',
          platform: this.state.platform,
        },
      ],
    }
  }

  async uploadFile(data, fileName, credential) {
    const formData = new FormData();
    formData.append('payload', data)
    formData.append('name', fileName)
    let fileId;
    return fetch(`https://api.${this.state.region}.saucelabs.com/v1/storage/upload`, {
      method: 'POST',
      headers: {
        Accept: '*/*',
        Authorization:
          'Basic ' + credential,
        'User-Agent': 'chrome-extension',
      },
      body: formData,
    })
    .then((response) => response.json())
    .then((data) => {
      fileId = data.item.id;
      return fileId;
    })
    .catch((error) => {
      console.error('upload file Error:', error);
    });
  }

  handleCredential(event) {
    event.preventDefault();
    this.setState({token: true});
    let region;
    if (event.target.usRegion.checked) {
      region = event.target.usRegion.value;
    } else {
      region = event.target.euRegion.value;
    }
    // eslint-disable-next-line no-undef
    chrome.storage.session.set({
      username: event.target.username.value,
      accessKey: event.target.accessKey.value,
      region,
      token: true,
    });
  }

  handleConfig(event) {
    event.preventDefault();
    this.setState({
      buildId: event.target.buildId.value,
      tags: event.target.tags.value,
      platform: event.target.platform.value,
      trigger: true,
    })
  }

  async readStorage(key) {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      chrome.storage.session.get([key], function (result) {
        if (result[key] === undefined) {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject();
        } else {
          resolve(result[key]);
        }
      });
    });
  }

  composeUrl(jobId) {
    switch (this.state.region) {
      case 'us-west-1': 
        return `https://app.saucelabs.com/tests/${jobId}`;
      case 'eu-central-1':
        return `https://app.eu-central-1.saucelabs.com/tests/${jobId}`;
      default:
        return '';
    }
  }

  render() {
    if (!this.state.token) {
      return (
        <Credential
          handleCredential={this.handleCredential}
        />  
      );
    } else if (this.state.jobId !== '') {
      const job = this.composeUrl(this.state.jobId);
      return (
        <div>
          <span>Sauce Job: </span>
          <a href={job} target="_blank" rel="noreferrer">{job}</a>
        </div>
      )
    } else if (this.state.trigger) {
      return (
        <div>Loading...</div>
      )
    } else if (this.state.failed && this.state.errMsg !== '') {
      return (
        <div>Failed to trigger a test, reason: {this.state.errMsg}</div>
      )
    } else {
      return (
        <ConfigForm
          handleConfig={this.handleConfig}
        />
      )
    }
  }
}

export default App;
