function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <h3 className="stat-card-title">
        {title}
      </h3>

      <h2 className="stat-card-value">
        {value}
      </h2>
    </div>
  );
}

export default StatCard;
