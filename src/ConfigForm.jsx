import React from "react";
import './ConfigForm.css'

class ConfigForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      platform: 'Windows 11',
      tunnelName: '',
    }
  }

  handleChange(key, event) {
    this.setState({[key]: event.target.value});
  }

  render() {
    const {
      handleConfig,
      tunnels,
    } = this.props;

      return (
        <div className="form">
          <form onSubmit={(event) => handleConfig(event, this.state)}>
            { tunnels.length > 0 && (
              <div className="form-row">
                <label className="form-label">
                  Tunnel Name
                </label>
                <select className="tunnel" id="tunnel" value={this.state.tunnelName} onChange={(event) => this.handleChange('tunnelName', event)}>
                  <option value="not set">Not Set</option>
                  { tunnels.map((tunnel) => (
                      <option value={tunnel}>{tunnel}</option>
                    ))
                  }
                </select>
              </div>
            )}
            <div className="form-row">
              <label className="form-label">
                Platform
              </label>
              <select className="platform" id="platform" value={this.state.platform} onChange={(event) => this.handleChange('platform', event)}>
                <option value="Windows 11">Windows 11</option>
                <option value="Windows 10">Windows 10</option>
                <option value="macOS 12">macOS 12</option>
                <option value="macOS 11.00">macOS 11</option>
              </select>
            </div>
            <div className="form-submit">
              <input className="submit" type="submit" value="Submit" />
            </div>
          </form>
        </div>
      )
  }
}

export default ConfigForm;