function formatDate(dateString) {
  // Format the dateObject as a string in the user's locale using the toLocaleString method
  // From ### "2023-04-29T12:30:00Z" ### to ### "4/29/2023, 8:30:00 AM" ###
  return new Date(dateString).toLocaleString();
}

module.exports = { formatDate };
