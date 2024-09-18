// components/SocialShareCard.tsx
import { FC } from "react";
import { Twitter, Facebook, Linkedin } from "lucide-react";

interface SocialShareCardProps {
  onShare: () => void;
  onCancel: () => void;
}

const SocialShareCard: FC<SocialShareCardProps> = ({ onShare, onCancel }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
      <div className="bg-white p-10 rounded-lg shadow-lg w-[550px] mx-6 md:mx-0">
        <h2 className="text-lg font-semibold mb-2">
          We&apos;d Love Your Feedback!
        </h2>
        <p className="mb-8">
          Before you download your file, feel free to share your experience with
          us on social media.
        </p>
        <div className="flex justify-around mb-10">
          <a
            href="https://twitter.com/intent/tweet?text=Just%20generated%20my%20WordPress%20XML%20file%20using%20Shopify%20to%20WP%20import%20tool!&url=YOUR_URL"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700"
          >
            <Twitter className="w-6 h-6" />
          </a>
          <a
            href="https://www.facebook.com/sharer/sharer.php?u=YOUR_URL"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            <Facebook className="w-6 h-6" />
          </a>
          <a
            href="https://www.linkedin.com/sharing/share-offsite/?url=YOUR_URL"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 hover:text-blue-900"
          >
            <Linkedin className="w-6 h-6" />
          </a>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onShare}
            className="px-4 py-2 bg-blue-500 text-white rounded mr-2 hover:bg-blue-600"
          >
            I Just Want My Download
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SocialShareCard;
