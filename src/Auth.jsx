export default function Auth() {
  const artSrc = `${import.meta.env.BASE_URL}khalifa.png`;

  return (
    <div className="auth-split-page">
      <div className="auth-pane auth-pane--form">
        <main className="auth-form-container" aria-labelledby="service-closed-heading">
          <div className="auth-heading-group">
            <h1 id="service-closed-heading" className="auth-heading">
              Repeat AI is no longer available
            </h1>
            <p className="auth-helper">
              Unfortunately, the cost of running the service was no longer sustainable.
              New and existing users can no longer sign in.
            </p>
          </div>

          <div className="auth-info-box">
            Thank you to everyone who supported Repeat AI.
          </div>
        </main>
      </div>

      <div className="auth-pane auth-pane--art" aria-hidden="true">
        <img src={artSrc} alt="" className="auth-art-image" />
      </div>
    </div>
  );
}
