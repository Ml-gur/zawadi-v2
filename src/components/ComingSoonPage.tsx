import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export default function ComingSoonPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-3">AI Essay Studio</h1>
        <p className="text-sm text-on-surface-variant mb-2">
          This feature is coming soon.
        </p>
        <p className="text-xs text-on-surface-variant/60">
          We're integrating a working DeepSeek API key to power smart essay drafting,
          critiquing, and polishing. You'll be notified as soon as it's live.
        </p>
      </motion.div>
    </div>
  );
}
