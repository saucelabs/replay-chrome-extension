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

  render() {
    const {
      handleCredential
    } = this.props;

    return (
      <div className="form">
        <form onSubmit={handleCredential}>
          <label className="form-label">
            Sauce User Name 
            <input id="username" className="username" type="text" value={this.state.username} onChange={(event) => {this.setState({username: event.target.value})}} />
          </label>
          <label className="form-label">
            Sauce Access Key 
            <input id="accessKey" className="accessKey" type="password" value={this.state.accessKey} onChange={(event) => {this.setState({accessKey: event.target.value})}} />
            <br/>
          </label>
          <label className="region form-label">
              <input
                id="usRegion"
                type="radio"
                value="us-west-1"
                checked={this.state.region === 'us-west-1'}
                onChange={(event) => {this.setState({region: event.target.value})}}
              />
              us-west-1
              <input
                id="euRegion"
                type="radio"
                value="eu-central-1"
                checked={this.state.region === 'eu-central-1'}
                onChange={(event) => {this.setState({region: event.target.value})}}
              />
              eu-central-1
          </label>
					<label className="form-label">
          	<input id="submit" className="submit" type="submit" value="Submit" />
					</label>
        </form>
      </div>
    );
  }
}

export default Credential;
