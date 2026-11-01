// Wording for pickup vs drop-off notifications (one place, used by every route).
const DIRECTIONS = ['pickup', 'dropoff'];
const normDirection = d => (d === 'dropoff' ? 'dropoff' : 'pickup');

function requestText(direction, asker, child, when) {
  return normDirection(direction) === 'dropoff'
    ? { title: 'Drop-off request', body: `${asker} asks you to bring ${child} · ${when}` }
    : { title: 'Pickup request',   body: `${asker} asks you to pick up ${child} · ${when}` };
}

// newStatus: going | declined | cancelled | picked_up
function statusText(direction, newStatus, person, child) {
  const drop = normDirection(direction) === 'dropoff';
  if (newStatus === 'going') {
    return drop
      ? { type: 'pickup_going', title: 'Drop-off confirmed', body: `${person} is going to bring ${child}` }
      : { type: 'pickup_going', title: 'Pickup confirmed',   body: `${person} is going to pick up ${child}` };
  }
  if (newStatus === 'declined' || newStatus === 'cancelled') {
    return drop
      ? { type: 'pickup_needed', title: 'Drop-off needed', body: `${person} can't bring ${child}` }
      : { type: 'pickup_needed', title: 'Pickup needed',   body: `${person} can't pick up ${child}` };
  }
  if (newStatus === 'picked_up') {
    return drop
      ? { type: 'pickup_done', title: 'Dropped off', body: `${child} has been dropped off by ${person}` }
      : { type: 'pickup_done', title: 'Picked up',   body: `${child} has been picked up by ${person}` };
  }
  return null;
}

module.exports = { DIRECTIONS, normDirection, requestText, statusText };
