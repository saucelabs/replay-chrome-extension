import React from "react";
import ConfigForm from "./ConfigForm";
import Credential from "./Credential";
import './App.css';

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
      suite: '',
      buildId: '',
      tags: '',
      jobId: '',
      platform: '',
      failed: false,
      errMsg: '',
      triggered: false,
      validationMsg: '',
    };
    this.handleCredential = this.handleCredential.bind(this);
    this.handleConfig = this.handleConfig.bind(this);
  }

  async componentDidMount() { 
    const token = await this.readStorage('token');
    this.setState({token: token});
  }

  async componentDidUpdate() {
    if (this.state.platform === '' || this.state.suite !== '' || this.state.jobId !== '' || this.state.errMsg !== '' || this.state.validationMsg !== '') {
      return;
    }

    const username = await this.readStorage('username');
    const accessKey = await this.readStorage('accessKey');
    const credential = window.btoa(`${username}:${accessKey}`);
    const recording = await this.readStorage('recording');
    this.setState({suite: JSON.parse(recording).title});

    let fileId;
    try {
      fileId = await this.uploadFile(recording, 'recordings.json', credential)
    } catch (err) {
      this.setState({
        triggered: false,
        failed: true,
        errMsg: 'failed to upload the recording file, ' + err.toString(),
      })
      return;
    }

    let configFileId;
    try {
      configFileId = await this.uploadFile(JSON.stringify(this.composeConfig()), 'sauce-runner.json', credential)
    } catch (err) {
      this.setState({
        triggered: false,
        failed: true,
        errMsg: 'failed to upload the config file, ' + err.toString(),
      })
      return;
    }

    let runnerVersion;
    try {
      runnerVersion = await this.getRunnerVersion(credential)
    } catch (err) {
      this.setState({
        triggered: false,
        failed: true,
        errMsg: 'failed to get runner version, ' + err.toString(),
      })
      return;
    }

    const storage = `storage:${fileId},storage:${configFileId}`;
    let jobId;
    try {
      jobId = await this.startJob(credential, storage, runnerVersion)
    } catch (err) {
      this.setState({
        triggered: false,
        failed: true,
        errMsg: 'failed to triggered a sauce job, ' + err.toString(),
      })
      return;
    }
    this.setState({jobId: jobId})
    this.setState({platform: ''})
  }

  async getRunnerVersion(credential) {
    const url = `https://api.${this.state.region}.saucelabs.com/v1/testcomposer/frameworks/puppeteer-replay`
    let resp;
    try {
      resp = await fetch(url, {
        headers: {
          Accept: '*/*',
          Authorization:
            'Basic ' + credential,
        },
      })
    } catch (err) {
      throw new Error(err);
    }
    const body = await resp.json()
    if (!resp.ok) {
      throw new Error(body);
    }

    return  body.version;
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
            name: this.state.suite,
            build: this.state.buildId,
            tags: this.state.tags.split(','),
            _batch: {
              framework: 'puppeteer-replay',
              frameworkVersion: 'latest',
              runnerVersion: runnerVersion,
              testFile: this.state.suite,
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
    let resp;
    try {
      resp = await fetch(`https://ondemand.${this.state.region}.saucelabs.com/wd/hub/session`, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          Authorization: 'Basic ' + credential,
        },
        body: JSON.stringify(data),
      })
    } catch (err) {
      throw new Error(err);
    }
    const body = await resp.json()
    if (!resp.ok) {
      throw new Error(body.value.message);
    }

    return body.sessionId;
  }

  composeConfig() {
    return {
      sauce: {
        region: this.state.region,
      },
      suites: [
        {
          name: this.state.suite,
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
    let resp;
    try {
       resp = await fetch(`https://api.${this.state.region}.saucelabs.com/v1/storage/upload`, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          Authorization:
            'Basic ' + credential,
          'User-Agent': 'chrome-extension',
        },
        body: formData,
      })
    } catch (err) {
      throw new Error(err);
    }
    const body = await resp.json()
    if (!resp.ok) {
      throw new Error(body.detail);
    }
    
    return body.item.id;
  }

  handleCredential(event, credentials) {
    event.preventDefault()
    const username = credentials.username;
    const accessKey = credentials.accessKey;
    if (!username || !accessKey) {
      this.setState({validationMsg: 'username and access key are required'});
      return;
    }
    // eslint-disable-next-line no-undef
    chrome.storage.session.set({
      username,
      accessKey,
      region: credentials.region,
      token: true,
    });
    this.setState({token: true});
  }

  handleConfig(event, config) {
    event.preventDefault();
    this.setState({
      buildId: config.buildId,
      tags: config.tags,
      platform: config.value,
      triggered: true,
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
        <div>
          <Credential
          handleCredential={this.handleCredential} />
          {this.state.validationMsg !== '' && (<div className="validation">{this.state.validationMsg}</div>)}
        </div>
      );
    } else if (this.state.jobId !== '') {
      const job = this.composeUrl(this.state.jobId);
      return (
        <div>
          <span>Sauce Job: </span>
          <a href={job} target="_blank" rel="noreferrer">{job}</a>
        </div>
      )
    } else if (this.state.triggered) {
      return (
        <div>Loading...</div>
      )
    } else if (this.state.failed && this.state.errMsg !== '') {
      return (
        <div>Failed to run a test, reason: {this.state.errMsg}</div>
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
