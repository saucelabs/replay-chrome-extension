import React from "react";
import ConfigForm from "./ConfigForm";
import LoginForm from "./LoginForm";
import Logout from './Logout';
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
      region: '',
      suite: '',
      jobId: '',
      platform: '',
      tunnel: '',
      availableTunnels: [],
      failed: false,
      errMsg: '',
      triggered: false,
      validationMsg: '',
      userAgent: `SauceReplay/${chrome.runtime.getManifest().version}`,
    };
    this.handleLogin = this.handleLogin.bind(this);
    this.handleConfig = this.handleConfig.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  async componentDidMount() {
    const token = await this.readStorage('token');
    this.setState({token: token});

    const {
      username,
      region,
      credential,
    } = await this.getAccountSetting();

    // fetch tunnel info every 20 seconds
    setInterval(async () => {
      const tunnels = await this.getTunnels(credential, username, region);
      this.setState({availableTunnels: tunnels});
    }, 20000);
  }

  async componentDidUpdate() {
    if (this.state.platform === '' || this.state.suite !== '' || this.state.jobId !== ''
      || this.state.errMsg !== '' || this.state.validationMsg !== '' || this.state.region !== '') {
      return;
    }

    const {
      region,
      credential,
    } = await this.getAccountSetting();

    const recording = await this.readStorage('recording');
    this.setState({suite: JSON.parse(recording).title});

    let fileId;
    try {
      fileId = await this.uploadFile(recording, 'recordings.json', credential, region)
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
      configFileId = await this.uploadFile(JSON.stringify(this.composeConfig(region)), 'sauce-runner.json', credential, region)
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
      runnerVersion = await this.getRunnerVersion(credential, region)
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
      jobId = await this.startJob(credential, storage, runnerVersion, region)
    } catch (err) {
      this.setState({
        triggered: false,
        failed: true,
        errMsg: 'failed to triggered a sauce job, ' + err.toString(),
      })
      return;
    }
    this.setState({
      jobId: jobId,
      platform: '',
      region: region
    });
  }

  async getAccountSetting() {
    const username = await this.readStorage('username');
    const accessKey = await this.readStorage('accessKey');
    const region = await this.readStorage('region') || 'us-west-1';
    const credential = window.btoa(`${username}:${accessKey}`);
    return { username, accessKey, region, credential };
  }

  async getTunnels(credential, username, region) {
    const url = `https://api.${region}.saucelabs.com/rest/v1/${username}/tunnels?full=true&all=true`;
    let resp;
    try {
      resp = await fetch(url, {
        headers: {
          Accept: '*/*',
          Authorization:
            'Basic ' + credential,
          'User-Agent': this.state.userAgent,
        },
        credentials: 'omit',
      })
    } catch (err) {
      throw new Error(err);
    }
    const body = await resp.json()
    if (!resp.ok) {
      throw new Error(body);
    }
    const tunnelIdentifiers = [];
    Object.values(body).forEach(tunnels => {
      tunnels.forEach(item => 
        tunnelIdentifiers.push(item.tunnel_identifier)
      )
    })

    return tunnelIdentifiers;
  }

  async getRunnerVersion(credential, region) {
    const url = `https://api.${region}.saucelabs.com/v1/testcomposer/frameworks/puppeteer-replay`
    let resp;
    try {
      resp = await fetch(url, {
        headers: {
          Accept: '*/*',
          Authorization:
            'Basic ' + credential,
          'User-Agent': this.state.userAgent,
        },
        credentials: 'omit',
      })
    } catch (err) {
      throw new Error(err);
    }
    const body = await resp.json()
    if (!resp.ok) {
      throw new Error(body);
    }

    return body.version;
  }

  async startJob(credential, storage, runnerVersion, region) {
    const data = {
      capabilities: {
        alwaysMatch: {
          app: storage,
          browserName: 'googlechrome',
          platformName: this.state.platform || 'Windows 11',
          'sauce:options': {
            name: this.state.suite,
            _batch: {
              framework: 'puppeteer-replay',
              frameworkVersion: 'latest',
              runnerVersion: runnerVersion,
              testFile: this.state.suite,
              args: null,
              video_fps: 13,
            },
            tunnelIdentifier: this.state.tunnel,
            idleTimeout: 9999,
            maxDuration: 10800,
            user_agent: this.state.userAgent,
          },
        },
      },
    };
    let resp;
    try {
      resp = await fetch(`https://ondemand.${region}.saucelabs.com/wd/hub/session`, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          Authorization: 'Basic ' + credential,
          'User-Agent': this.state.userAgent,
        },
        credentials: 'omit',
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

  composeConfig(region) {
    return {
      sauce: {
        region: region,
        tunnel: {
          name: this.state.tunnel,
        }
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

  async uploadFile(data, fileName, credential, region) {
    const formData = new FormData();
    formData.append('payload', data)
    formData.append('name', fileName)
    let resp;
    try {
      resp = await fetch(`https://api.${region}.saucelabs.com/v1/storage/upload`, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          Authorization:
            'Basic ' + credential,
          'User-Agent': this.state.userAgent,
        },
        credentials: 'omit',
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

  handleLogin(event, credentials) {
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
      platform: config.platform,
      tunnel: config.tunnel,
      triggered: true,
    })
  }

  async readStorage(key) {
    const result = await chrome.storage.session.get([key]);
    return result[key];
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

  handleLogout() {
    this.setState({
      token: false,
      region: '',
      suite: '',
      jobId: '',
      platform: '',
      failed: false,
      errMsg: '',
      triggered: false,
      validationMsg: '',
    });
  }

  render() {
    if (!this.state.token) {
      return (
        <div>
          <LoginForm
            handleLogin={this.handleLogin}/>
          {this.state.validationMsg !== '' && (<div className="validation">{this.state.validationMsg}</div>)}
        </div>
      );
    } else if (this.state.jobId !== '') {
      const job = this.composeUrl(this.state.jobId);
      return (
        <div>
          <span>Sauce Job: </span>
          <a href={job} target="_blank" rel="noreferrer">{job}</a>
          <br/>
          <Logout handleLogout={this.handleLogout}/>
        </div>
      )
    } else if (this.state.triggered) {
      return (
        <div>Loading...</div>
      )
    } else if (this.state.failed && this.state.errMsg !== '') {
      return (
        <div>
          <div>Failed to run a test, reason: {this.state.errMsg}</div>
          <br/>
          <Logout handleLogout={this.handleLogout}/>
        </div>
      )
    } else {
      return (
        <div>
          <ConfigForm
            handleConfig={this.handleConfig}
            tunnels={this.state.availableTunnels}
          />
          <br/>
          <Logout handleLogout={this.handleLogout}/>
        </div>
      )
    }
  }
}

export default App;
