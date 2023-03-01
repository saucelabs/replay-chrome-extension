import React from "react";
import './ConfigForm.css'

class ConfigForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      buildId: '',
      tags: '',
      platform: 'Windows 11',
    }
  }

  handleChange(key, event) {
    this.setState({[key]: event.target.value,});
  }

  render() {
    const {
      handleConfig
    } = this.props;

      return (
        <div className="form" id="form">
          <form onSubmit={handleConfig}>
            <label className="form-label">
              Platform
                <select className="platform" id="platform" value={this.state.platform} onChange={(event) => this.handleChange('platform', event)}>
                  <option value="Windows 11">Windows 11</option>
                  <option value="Windows 10">Windows 10</option>
                  <option value="macOS 12">macOS 12</option>
                  <option value="macOS 11.00">macOS 11</option>
                </select>
            </label>
            <label className="form-label">
              Build ID
              <input id="buildId" className="buildId" type="text" value={this.state.buildId} onChange={(event) => this.handleChange('buildId', event)} />
              <br/>
            </label>
            <label className="form-label">
              Tags
              <input id="tags" className="tags" type="text" value={this.state.tags} onChange={(event) => this.handleChange('tags', event)} />
              <br/>
            </label>
            <label className="form-label">
              <input className="submit" type="submit" value="Submit" />
            </label>
          </form>
        </div>
      )
  }
}

export default ConfigForm;