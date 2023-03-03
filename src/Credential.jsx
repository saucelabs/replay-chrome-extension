import React from "react";
import "./Credential.css";

class Credential extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      accessKey: '',
      region: 'us-west-1',
    };
  }

  handleChange(key, event) {
    this.setState({[key]: event.target.value});
  }

  render() {
    const {
      handleCredential
    } = this.props;

    return (
      <div className="form">
        <form onSubmit={(event) => handleCredential(event, this.state)}>
          <label className="form-label">
            Sauce User Name 
          </label>
          <input id="username" className="username" type="text" value={this.state.username} onChange={(event) => this.handleChange('username', event)} />
          <label className="form-label">
            Sauce Access Key 
          </label>
          <input id="accessKey" className="accessKey" type="password" value={this.state.accessKey} onChange={(event) => this.handleChange('accessKey', event)} />
          <div className="region form-label">
            <input
              id="usRegion"
              type="radio"
              value="us-west-1"
              checked={this.state.region === 'us-west-1'}
              onChange={(event) => this.handleChange('region', event)}              
            />
            us-west-1
            <input
              id="euRegion"
              type="radio"
              value="eu-central-1"
              checked={this.state.region === 'eu-central-1'}
              onChange={(event) => this.handleChange('region', event)}
            />
            eu-central-1
          </div>
          <input id="submit" className="submit" type="submit" value="Submit" />
        </form>
      </div>
    );
  }
}

export default Credential;
