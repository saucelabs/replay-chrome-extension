import React from 'react';

class Logout extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { handleLogout } = this.props;

    return (
      <button className="logout" onClick={handleLogout}>
        Logout
      </button>
    );
  }
}

export default Logout;
