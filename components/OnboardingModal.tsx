interface OnboardingModalProps {
  onDismiss: () => void;
}

export default function OnboardingModal({ onDismiss }: OnboardingModalProps) {
  return (
    <div className="onboardOverlay">
      <div className="onboardCard">
        <h2>Halo 👋</h2>
        <p>
          Ini adalah <b>simulasi visual</b> pergerakan bus Transjakarta di 13 koridor trunk, di
          atas peta Jabodetabek asli. Posisi setiap bus dihitung dari jadwal (headway &amp; waktu
          tempuh), <b>bukan</b> pelacakan GPS real-time resmi.
        </p>
        <p>
          Nyalakan/matikan koridor di panel kanan, klik bus mana pun untuk lihat detail arah &amp;
          posisinya di antara halte, dan atur kecepatan jam simulasi sesuka Anda.
        </p>
        <button onClick={onDismiss}>Mengerti, mulai jelajah</button>
      </div>
    </div>
  );
}
