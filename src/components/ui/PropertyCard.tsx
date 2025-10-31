// src/components/ui/PropertyCard.tsx
interface PropertyCardProps {
  id: string;
  name: string;
  price: number;
  heroImage: string;
  detailImage: string;
  totalTokens: number;
  tokensRemaining: number;
  tokensSold?: number; // ✅ optional now
}

const PropertyCard = ({
  id,
  name,
  price,
  heroImage,
  detailImage,
  totalTokens,
  tokensRemaining,
  tokensSold = 0, // ✅ default to 0
}: PropertyCardProps) => {
  const progress = totalTokens ? (tokensSold / totalTokens) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
      <img src={heroImage} alt={name} className="rounded-lg w-full object-cover mb-4" />
      <h2 className="text-xl font-bold mb-2">{name}</h2>
      <p>Price: {price}</p>
      <p>
        Tokens sold: {tokensSold} / {totalTokens}
      </p>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-primary h-2 rounded-full" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default PropertyCard;
