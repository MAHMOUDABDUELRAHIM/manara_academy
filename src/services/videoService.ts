export class VideoService {
  /**
   * Delete a video from Bunny by GUID via backend API.
   */
  static async deleteBunnyVideo(guid: string): Promise<void> {
    const endpoint = `/api/delete-bunny-video`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        const msg = data?.message || `Delete failed with status ${res.status}`;
        throw new Error(msg);
      }
    } catch (err) {
      console.error('Error deleting Bunny video:', err);
      throw err;
    }
  }

  /**
   * Delete a video from S3-compatible storage by key via backend API.
   */
  static async deleteS3Video(key: string): Promise<void> {
    const endpoint = `/api/delete-s3-video`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        const msg = data?.message || `Delete failed with status ${res.status}`;
        throw new Error(msg);
      }
    } catch (err) {
      console.error('Error deleting S3 video:', err);
      throw err;
    }
  }
}