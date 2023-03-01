import React from "react";

class ConfigForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      buildId: '',
      tags: '',
      platform: 'Windows 11',
    }
  }

  handleUpdate(key, event) {
    this.setState({[key]: event.target.value,});
  }

  handlePlatform(event) {
    this.setState({platform: event.target.value})
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
                <select className="platform" id="platform" value={this.state.platform} onChange={(event) => this.handlePlatform(event)}>
                  <option value="Windows 11">Windows 11</option>
                  <option value="Windows 10">Windows 10</option>
                  <option value="macOS 12">macOS 12</option>
                  <option value="macOS 11.00">macOS 11</option>
                </select>
            </label>
            <label className="form-label">
              Build ID
              <input id="buildId" className="buildId" type="text" value={this.state.buildId} onChange={(event) => {this.setState({buildId: event.target.value})}} />
              <br/>
            </label>
            <label className="form-label">
              Tags
              <input id="tags" className="tags" type="text" value={this.state.tags} onChange={(event) => {this.setState({tags: event.target.value})}} />
              <br/>
            </label>
            <input className="submit" type="submit" value="Submit" />
          </form>
        </div>
      )
  }
}

export default ConfigForm;