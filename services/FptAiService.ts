import axios from "axios";
import FormData from "form-data";

interface IdRecognitionResult {
  success: boolean;
  data?: {
    id: string;
    name: string;
    dob: string;
    sex: string;
    nationality: string;
    home: string;
    address: string;
    doe: string;
    type: string;
    type_new: string;
  };
  errorCode?: string;
  message?: string;
}

interface LivenessResult {
  success: boolean;
  data?: {
    is_real: boolean;
    confidence: number;
  };
  errorCode?: string;
  message?: string;
}

interface FaceMatchResult {
  success: boolean;
  data?: {
    is_match: boolean;
    similarity: number;
  };
  errorCode?: string;
  message?: string;
}

export class FptAiService {
  private static apiKey = process.env.FPT_AI_API_KEY || "";
  private static baseUrl = process.env.FPT_AI_BASE_URL || "https://api.fpt.ai";

  /**
   * ID Recognition - Extract information from ID card/CCCD
   */
  static async recognizeId(imageBuffer: Buffer): Promise<IdRecognitionResult> {
    try {
      const formData = new FormData();
      formData.append("image", imageBuffer, { filename: "id_card.jpg" });

      const response = await axios.post(
        `${this.baseUrl}/vision/idr/vnm`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            "api-key": this.apiKey,
          },
        }
      );

      if (response.data.errorCode === 0) {
        return {
          success: true,
          data: response.data.data[0],
        };
      }

      return {
        success: false,
        errorCode: response.data.errorCode,
        message: response.data.errorMessage || "ID recognition failed",
      };
    } catch (error: any) {
      console.error("FPT AI ID Recognition error:", error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.errorMessage || error.message,
      };
    }
  }

  /**
   * Liveness Detection - Check if face is real (not photo/video)
   * NOTE: This function is kept for future use but not currently used
   * because FPT AI Liveness v3 requires video input, not image
   */
  static async checkLiveness(imageBuffer: Buffer): Promise<LivenessResult> {
    try {
      const formData = new FormData();
      formData.append("image", imageBuffer, { filename: "face.jpg" });

      const response = await axios.post(
        `${this.baseUrl}/vision/liveness`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            "api-key": this.apiKey,
          },
        }
      );

      if (response.data.errorCode === 0) {
        const data = response.data.data;
        return {
          success: true,
          data: {
            is_real: data.is_real === 1,
            confidence: data.confidence || 0,
          },
        };
      }

      return {
        success: false,
        errorCode: response.data.errorCode,
        message: response.data.errorMessage || "Liveness check failed",
      };
    } catch (error: any) {
      console.error("FPT AI Liveness error:", error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.errorMessage || error.message,
      };
    }
  }

  /**
   * Face Match - Compare selfie with ID card photo
   */
  static async matchFaces(
    idCardImageBuffer: Buffer,
    selfieImageBuffer: Buffer
  ): Promise<FaceMatchResult> {
    try {
      const formData = new FormData();
      // FPT AI requires field name "file[]" for both images
      formData.append("file[]", idCardImageBuffer, { filename: "id_card.jpg" });
      formData.append("file[]", selfieImageBuffer, { filename: "selfie.jpg" });

      const response = await axios.post(
        `${this.baseUrl}/dmp/checkface/v1`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            "api_key": this.apiKey, // Note: api_key not api-key
          },
        }
      );

      if (response.data.code === "200") {
        const data = response.data.data;
        return {
          success: true,
          data: {
            is_match: data.isMatch === true,
            similarity: data.similarity || 0,
          },
        };
      }

      return {
        success: false,
        errorCode: response.data.code,
        message: response.data.message || "Face matching failed",
      };
    } catch (error: any) {
      console.error("FPT AI Face Match error:", error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Complete eKYC verification - ID Recognition + Face Match only
   * (Liveness v3 requires video, so we skip it for simplicity)
   */
  static async verifyEkyc(
    idCardFrontBuffer: Buffer,
    selfieBuffer: Buffer
  ): Promise<{
    success: boolean;
    data?: {
      idInfo: any;
      faceMatch: { is_match: boolean; similarity: number };
    };
    message?: string;
  }> {
    try {
      // Step 1: Extract ID information
      const idResult = await this.recognizeId(idCardFrontBuffer);
      if (!idResult.success) {
        return {
          success: false,
          message: `ID recognition failed: ${idResult.message}`,
        };
      }

      // Step 2: Match faces (skip liveness check as it requires video)
      const faceMatchResult = await this.matchFaces(idCardFrontBuffer, selfieBuffer);
      if (!faceMatchResult.success) {
        return {
          success: false,
          message: `Face matching failed: ${faceMatchResult.message}`,
        };
      }

      if (!faceMatchResult.data?.is_match) {
        return {
          success: false,
          message: "Face matching failed: Faces do not match",
        };
      }

      return {
        success: true,
        data: {
          idInfo: idResult.data,
          faceMatch: faceMatchResult.data!,
        },
      };
    } catch (error: any) {
      console.error("FPT AI eKYC verification error:", error);
      return {
        success: false,
        message: error.message || "eKYC verification failed",
      };
    }
  }
}
