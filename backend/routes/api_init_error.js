const NOT_FOUND = (res) => {
  res.status(404).send("Endpoint not found!");
};

const ACCESS_DENIED = (res) => {
  res.status(403).send("Direct Access denied!");
};

module.exports = {
  NOT_FOUND,
  ACCESS_DENIED,
};
