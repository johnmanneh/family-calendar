import React from 'react';
import './EventDetails.css';

const EventDetailsEmpty =()=>{

    return(
        <div className="event-details-panel">
        <div className="event-details-empty">
          <span>🗓️</span>
          <p>Select an event to see details</p>
        </div>
      </div>
    );

}


export default  EventDetailsEmpty;